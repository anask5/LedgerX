import io
import json
from datetime import date
from dateutil.relativedelta import relativedelta
from bson import ObjectId
from google import genai
from google.genai import types
from PIL import Image
from app.config import Config

client = genai.Client(
    api_key=Config.GEMINI_API_KEY,
    http_options=types.HttpOptions(timeout=25000),  # 25s max per attempt
)

# Valid Gemini 3 models ordered for high throughput + low latency on free tier
OCR_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]

OCR_PROMPT = """
Extract receipt or tax invoice data from this file into strict JSON matching this schema:
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


def _optimize_file_bytes(file_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """Compress/downscale large raster images while keeping PDFs intact for native Gemini PDF parsing."""
    normalized_mime = (mime_type or "image/jpeg").lower().strip()
    if normalized_mime == "application/pdf" or not normalized_mime.startswith("image/"):
        return file_bytes, normalized_mime

    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        max_dim = 1600
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except Exception as e:
        print(f"[OCR] Image optimization skipped ({e}), using original bytes", flush=True)
        return file_bytes, normalized_mime


def _parse_purchase_date(raw_date: object) -> date:
    if isinstance(raw_date, str) and raw_date.strip():
        try:
            return date.fromisoformat(raw_date.strip()[:10])
        except ValueError:
            pass
    return date.today()


def _enrich_items(items: object, purchase_date: date) -> list[dict]:
    if not isinstance(items, list):
        return []

    today = date.today()
    enriched: list[dict] = []

    for raw_item in items:
        if not isinstance(raw_item, dict):
            continue

        item = dict(raw_item)
        item["id"] = str(ObjectId())

        w_months = item.get("brand_warranty_months")
        try:
            months_int = int(w_months) if w_months is not None else 0
        except (TypeError, ValueError):
            months_int = 0

        if months_int > 0:
            expiry = purchase_date + relativedelta(months=months_int)
            item["brand_warranty_expiry"] = expiry.isoformat()
            days_left = (expiry - today).days
            if days_left < 0:
                item["status"] = "expired"
            elif days_left <= 14:
                item["status"] = "expiring_soon"
            else:
                item["status"] = "active"
        else:
            item["brand_warranty_expiry"] = None
            item["status"] = "none"

        item.setdefault("extended_warranty_months", None)
        item.setdefault("extended_warranty_expiry", None)
        enriched.append(item)

    return enriched


def _generate_with_fallback(contents: list, config: types.GenerateContentConfig) -> dict:
    last_err: Exception | None = None

    for model_name in OCR_MODELS:
        try:
            print(f"[OCR] Trying {model_name}...", flush=True)
            res = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            raw_text = (getattr(res, "text", None) or "").strip()
            if not raw_text:
                raise ValueError(f"Empty response from {model_name}")

            parsed = json.loads(raw_text)
            if not isinstance(parsed, dict):
                raise ValueError(f"JSON root is not an object from {model_name}")

            print(f"[OCR] Success with {model_name}", flush=True)
            return parsed
        except Exception as e:
            print(f"[OCR] {model_name} failed: {type(e).__name__}: {e}", flush=True)
            last_err = e

    if last_err is not None:
        raise last_err
    raise RuntimeError("No OCR models configured")


def parse_receipt_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    if not Config.GEMINI_API_KEY or not image_bytes:
        return {}

    prepared_bytes, prepared_mime = _optimize_file_bytes(image_bytes, mime_type)

    data = _generate_with_fallback(
        contents=[
            types.Part.from_bytes(data=prepared_bytes, mime_type=prepared_mime),
            OCR_PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )

    p_date = _parse_purchase_date(data.get("purchase_date"))
    data["purchase_date"] = p_date.isoformat()
    data.setdefault("currency", "INR")
    data["items"] = _enrich_items(data.get("items"), p_date)
    return data