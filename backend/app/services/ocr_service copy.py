import json
from datetime import date
from dateutil.relativedelta import relativedelta
from bson import ObjectId
from google import genai
from google.genai import types
from app.config import Config

client = genai.Client(
    api_key=Config.GEMINI_API_KEY,
    http_options=types.HttpOptions(timeout=12000),  # 12 seconds max per model
)

OCR_MODELS = [
    "gemini-3.8-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
]

OCR_PROMPT = """
Extract receipt data from this image into strict JSON matching this schema:
{
  "store_name": "string",
  "store_address": "string or null",
  "store_phone": "string or null",
  "purchase_date": "YYYY-MM-DD",
  "total_amount": number,
  "currency": "INR",
  "payment_mode": "cash | upi | card | net_banking | wallet | other",
  "receipt_number": "string or null",
  "subtotal": number or null,
  "tax": number or null,
  "category": "Electronics | Furniture | Clothing | Groceries | Dining | Medical | Travel | Other",
  "ocr_confidence": number between 0 and 1,
  "needs_review": ["list any uncertain field names"],
  "return_deadline": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "price": number,
      "serial_number": "string or null",
      "brand_warranty_months": integer or null,
      "return_deadline": "YYYY-MM-DD or null"
    }
  ]
}
If a date is unclear, use today's date. Infer standard warranty months if explicitly printed on the bill.
"""


def _generate_with_fallback(contents, config):
    last_err = None
    for model_name in OCR_MODELS:
        try:
            print(f"[OCR] Trying {model_name}...", flush=True)
            res = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            print(f"[OCR] Success with {model_name}", flush=True)
            return res
        except Exception as e:
            print(f"[OCR] {model_name} failed: {e}", flush=True)
            last_err = e
    raise last_err


def parse_receipt_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    if not Config.GEMINI_API_KEY:
        return {}

    response = _generate_with_fallback(
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            OCR_PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    data = json.loads(response.text)
    p_date = date.fromisoformat(data.get("purchase_date") or date.today().isoformat())

    for item in data.get("items", []):
        item["id"] = str(ObjectId())
        w_months = item.get("brand_warranty_months")
        if w_months:
            expiry = p_date + relativedelta(months=int(w_months))
            item["brand_warranty_expiry"] = expiry.isoformat()
            days_left = (expiry - date.today()).days
            item["status"] = "expired" if days_left < 0 else ("expiring_soon" if days_left <= 14 else "active")
        else:
            item["brand_warranty_expiry"] = None
            item["status"] = "none"
        item.setdefault("extended_warranty_months", None)
        item.setdefault("extended_warranty_expiry", None)

    return data