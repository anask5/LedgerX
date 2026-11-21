import json
import logging
from datetime import date
from dateutil.relativedelta import relativedelta
from bson import ObjectId
from google import genai
from google.genai import types
from app.config import Config

logger = logging.getLogger(__name__)

client = genai.Client(
    api_key=Config.GEMINI_API_KEY,
    http_options=types.HttpOptions(timeout=12000),
)

# Put the model that actually succeeded first.
OCR_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]

OCR_PROMPT = """
You are a precise receipt OCR extraction system.

Extract only information that is visibly supported by the receipt.

STRICT RULES:
- Never invent, guess, or hallucinate values.
- If a field is unreadable, use null wherever the schema permits.
- Never replace a missing or unclear purchase date with today's date.
- Never invent item names, quantities, prices, tax, totals, receipt numbers,
  payment modes, brands, serial numbers, or warranties.
- Do not infer warranty duration from general industry knowledge.
- Warranty duration must only be extracted if explicitly stated.
- Preserve the actual numeric values printed on the receipt.
- Distinguish subtotal, tax, discounts and final total.
- The total_amount must represent the final amount paid, if clearly visible.
- If the receipt is partially visible, extract only the visible information.
- If an item price is uncertain, mark that field in needs_review.
- If the total does not match the item calculations, do not alter the
  printed values. Mark the discrepancy in needs_review.
- Return ONLY valid JSON. No markdown.

Schema:
{
  "store_name": "string or null",
  "store_address": "string or null",
  "store_phone": "string or null",
  "purchase_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "currency": "INR",
  "payment_mode": "cash | upi | card | net_banking | wallet | other",
  "receipt_number": "string or null",
  "subtotal": number or null,
  "tax": number or null,
  "category": "Electronics | Furniture | Clothing | Groceries | Dining | Medical | Travel | Other",
  "ocr_confidence": number between 0 and 1,
  "needs_review": ["field names requiring verification"],
  "return_deadline": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "price": number,
      "serial_number": "string or null",
      "brand_warranty_months": integer or null,
      "return_deadline": "YYYY-MM-DD or null"
    }
  ]
}

For dates:
- Convert readable dates to YYYY-MM-DD.
- If the date is ambiguous, use null and add purchase_date to needs_review.

For warranty:
- Extract warranty duration only when explicitly printed.
- Otherwise use null.

For payment mode:
- Use other if the mode cannot be determined.
"""

def _generate_with_fallback(contents, config):
    last_err = None

    for model_name in OCR_MODELS:
        try:
            logger.info("[OCR] Trying %s", model_name)

            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )

            logger.info("[OCR] Success with %s", model_name)
            return response

        except Exception as e:
            logger.exception("[OCR] Model %s failed", model_name)
            last_err = e

    raise last_err


def parse_receipt_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:

    if not Config.GEMINI_API_KEY:
        logger.error("[OCR] Missing Gemini API key")
        return {}

    if not image_bytes:
        logger.error("[OCR] Empty image payload")
        return {}

    logger.info(
        "[OCR] Incoming payload size=%s bytes, mime=%s",
        len(image_bytes),
        mime_type,
    )

    response = _generate_with_fallback(
        contents=[
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
            ),
            OCR_PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0,
        ),
    )

    raw_text = response.text

    if not raw_text:
        raise ValueError("Gemini returned an empty OCR response")

    logger.info("[OCR] Raw response: %s", raw_text)

    data = json.loads(raw_text)

    # Validate date without inventing one.
    purchase_date = None

    if data.get("purchase_date"):
        try:
            purchase_date = date.fromisoformat(data["purchase_date"])
        except (ValueError, TypeError):
            data["purchase_date"] = None
            data.setdefault("needs_review", []).append("purchase_date")

    if data.get("purchase_date") is None:
        data.setdefault("needs_review", []).append("purchase_date")

    # Normalize items and calculate warranty expiry safely.
    for item in data.get("items", []):
        item["id"] = str(ObjectId())

        warranty_months = item.get("brand_warranty_months")

        if warranty_months is not None and purchase_date is not None:
            try:
                warranty_months = int(warranty_months)

                if warranty_months < 0:
                    raise ValueError("Negative warranty duration")

                expiry = purchase_date + relativedelta(
                    months=warranty_months
                )

                item["brand_warranty_expiry"] = expiry.isoformat()

                days_left = (expiry - date.today()).days

                item["status"] = (
                    "expired"
                    if days_left < 0
                    else "expiring_soon"
                    if days_left <= 14
                    else "active"
                )

            except (ValueError, TypeError):
                item["brand_warranty_months"] = None
                item["brand_warranty_expiry"] = None
                item["status"] = "none"

                data.setdefault("needs_review", []).append(
                    "brand_warranty_months"
                )

        else:
            item["brand_warranty_expiry"] = None
            item["status"] = "none"

        item.setdefault("extended_warranty_months", None)
        item.setdefault("extended_warranty_expiry", None)

    # Deduplicate review fields.
    data["needs_review"] = list(
        dict.fromkeys(data.get("needs_review", []))
    )

    return data