# LedgerX Backend Documentation

> **Service:** LedgerX Backend API (`https://receiptwise1.onrender.com/api/v1`)  
> **Client Package:** `com.ledgerx.app` (Expo / React Native / Web)  
> **Runtime & Storage:** Python, FastAPI / Flask, MongoDB (`bson.ObjectId`), Google GenAI SDK (`google-genai`), Pillow, `python-dateutil`

---

## 1. System Overview

LedgerX is a receipt management, invoice OCR extraction, warranty tracking, CSV import/export, and controlled proof-sharing backend deployed as a web service on Render. Clients upload receipt images or PDF invoices, poll processing status, organize records and reminders, export or import CSV data, generate proof PDFs, and create time-bound, privacy-redacted share links.

### End-to-End Request & Processing Flow

1. **Authentication & Session Management:** Clients authenticate via `/api/v1/auth/*` and `/api/v1/me`, sending bearer access tokens on protected endpoints and refreshing tokens via `/api/v1/auth/refresh`.
2. **Receipt Ingestion & OCR:** Clients upload a receipt image or PDF via multipart form data (`POST /api/v1/receipts`). The backend persists the upload and record, runs multimodal OCR extraction via the Gemini GenAI client (`ocr.py`), normalizes dates and warranty expiries, and stores the structured result.
3. **Status Polling & Review:** While a receipt is processing, clients poll `GET /api/v1/receipts/{id}` until a terminal state (`completed` or `failed`) is reached, then review or edit extracted fields and line items.
4. **Reminders, Folders, Exports & Share Links:** Clients query warranty/expiry reminders (`/api/v1/reminders/*`), export or import CSV files (`/api/v1/exports/receipts.csv`, `/api/v1/imports/receipts.csv`), download proof PDFs (`/api/v1/receipts/{id}/proof`), and manage share links (`/api/v1/receipts/{id}/share-links`, `/api/v1/share-links/{link_id}`).

---

## 2. Backend Folder Structure

```text
backend/
├── app/
│   ├── __init__.py              # Application factory & blueprint/router registration
│   ├── config.py                # Environment configuration (API keys, JWT secret, DB & upload paths)
│   ├── extensions.py            # Shared extensions & database client initialization
│   ├── models/                  # Data models, schemas, and serialization helpers
│   │   ├── __init__.py
│   │   ├── user.py              # User & authentication document helpers
│   │   ├── receipt.py           # Receipt, line item, and processing status helpers
│   │   ├── reminder.py          # Warranty / return reminder helpers
│   │   └── share_link.py        # Expiring & redacted share link models
│   ├── routes/                  # HTTP API endpoint definitions
│   │   ├── __init__.py
│   │   ├── auth.py              # Register, login, refresh, logout, account deletion
│   │   ├── receipts.py          # Receipt CRUD, upload, polling, and proof endpoints
│   │   ├── reminders.py         # Upcoming, expiring-soon, and expired reminder feeds
│   │   ├── folders.py           # Folder and tag organization endpoints
│   │   ├── exports_imports.py   # CSV export and CSV bulk import endpoints
│   │   └── share.py             # Share link creation, listing, and revocation
│   ├── services/                # Business logic & external integrations
│   │   ├── __init__.py
│   │   ├── ocr.py               # Gemini multimodal receipt/invoice parser & warranty calculator
│   │   ├── storage.py           # File saving, MIME validation, and static/upload serving
│   │   ├── export_import.py     # CSV generation, parsing, and proof PDF generation
│   │   └── auth_service.py      # Password hashing, JWT signing/verification, token refresh
│   └── utils/                   # Shared helpers (date parsing, formatting, error handlers)
│       ├── __init__.py
│       ├── responses.py         # Standard JSON error & success response formatters
│       └── security.py          # Redaction & access-control helpers
├── uploads/                     # Uploaded receipts, generated CSV exports, and proof PDFs
├── requirements.txt             # Python dependencies
├── run.py / main.py             # WSGI / ASGI entry point for Gunicorn / Uvicorn
└── .env.example                 # Template of required environment variables
```

---

## 3. Folder & File-by-File Reference

### 3.1 Root Files

* **`run.py` / `main.py`**  
  Application entry point imported by the WSGI/ASGI server (`gunicorn` or `uvicorn`). Exposes the application instance and binds to the host/port configured by the runtime environment (such as port `10000` on Render).
* **`requirements.txt`**  
  Declares runtime dependencies including web framework packages, `google-genai`, `Pillow`, `python-dateutil`, `pymongo` / database driver, and JWT/auth libraries.
* **`.env.example`**  
  Documents required environment variables (`GEMINI_API_KEY`, `JWT_SECRET`, database URI, upload directory, and CORS settings) without storing secrets in source control.
* **`uploads/`**  
  Storage directory for uploaded receipt images/PDFs, generated CSV export files (e.g., `export_<id>.csv`), and generated proof PDFs served under `/uploads/...`.

---

### 3.2 `app/` Core Setup

* **`app/config.py`**  
  Centralizes configuration values loaded from environment variables via the `Config` class:
  * `GEMINI_API_KEY` for Google GenAI authentication.
  * `JWT_SECRET` (must be a persistent secret of at least 32 bytes for HS256/SHA-256 signing so tokens remain valid across restarts and deployments).
  * Database connection URI/name, upload folder path, and allowed CORS origins.
* **`app/extensions.py`**  
  Initializes shared service instances (database client/collection references, CORS configuration, and serialization utilities) so routes and services share consistent connections.
* **`app/__init__.py`**  
  Creates and configures the application instance, registers CORS middleware/headers, mounts `/uploads` static serving, registers all API route modules under `/api/v1`, and attaches global error handlers.

---

### 3.3 `app/models/`

* **`app/models/user.py`**  
  Defines user record structure and serialization (excluding sensitive password hashes from API responses), tracking account profile fields, timestamps, and status.
* **`app/models/receipt.py`**  
  Defines receipt documents and embedded line items, including `status` (`processing`, `completed`, `failed`), `store_name`, `store_address`, `store_phone`, `purchase_date`, `total_amount`, `currency`, `payment_mode`, `receipt_number`, `subtotal`, `tax`, `category`, `ocr_confidence`, `needs_review`, `return_deadline`, and `items`.
* **`app/models/reminder.py`**  
  Defines warranty and return reminder records linked to receipts and line items, along with status classification (`active`, `expiring_soon`, `expired`).
* **`app/models/share_link.py`**  
  Defines shareable proof link records containing the receipt reference, expiration timestamp (`24h`, `7d`, `30d`), privacy redaction flags (`hide_payment`, `hide_phone`), view counter (`view_count`), and active/revoked state.

---

### 3.4 `app/routes/`

* **`app/routes/auth.py`**  
  Implements authentication and account endpoints:
  * `POST /api/v1/auth/login` & `POST /api/v1/auth/register` (or signup) to issue access and refresh tokens.
  * `POST /api/v1/auth/refresh` to rotate/renew access tokens using a valid refresh token.
  * `GET /api/v1/me` to return the authenticated user profile.
  * `DELETE /api/v1/auth/account` (or user deletion route) to permanently remove the user's account and associated data.
* **`app/routes/receipts.py`**  
  Implements receipt management and scanning endpoints:
  * `POST /api/v1/receipts` — Accepts multipart image or PDF uploads, saves the file, creates the receipt record, triggers OCR processing, and returns the receipt payload.
  * `GET /api/v1/receipts` — Lists receipts with pagination (`page`, `page_size`) and sorting (`sort=newest`, etc.).
  * `GET /api/v1/receipts/{id}` — Fetches a single receipt record (used during OCR status polling and detail/review views).
  * `PATCH` / `PUT` / `DELETE /api/v1/receipts/{id}` — Updates reviewed receipt metadata/items or deletes a receipt.
  * `GET /api/v1/receipts/{id}/proof` — Generates or returns the URL for a formatted proof PDF.
* **`app/routes/reminders.py`**  
  Serves warranty and return deadline queries:
  * `GET /api/v1/reminders/upcoming`
  * `GET /api/v1/reminders/expiring-soon`
  * `GET /api/v1/reminders/expired`
* **`app/routes/folders.py`**  
  Manages folders and tags used to group and filter receipts in the vault.
* **`app/routes/exports_imports.py`**  
  Handles spreadsheet interoperability:
  * `GET /api/v1/exports/receipts.csv` — Builds a CSV export filtered by optional `date_from`, `date_to`, and `category` parameters and returns its download URL.
  * `POST /api/v1/imports/receipts.csv` — Accepts a multipart `.csv` file upload, validates/parses rows, inserts receipts, and returns `{ imported, skipped, errors }`.
* **`app/routes/share.py`**  
  Manages controlled proof sharing:
  * `POST /api/v1/receipts/{id}/share-links` — Creates a share link with `expiry` (`24h`, `7d`, `30d`), `hide_payment`, and `hide_phone`.
  * `GET /api/v1/receipts/{id}/share-links` — Lists active share links for a receipt.
  * `DELETE /api/v1/share-links/{link_id}` — Revokes a share link so it is no longer accessible.

---

### 3.5 `app/services/`

* **`app/services/ocr.py`**  
  Core multimodal extraction and warranty calculation module:
  * Initializes `genai.Client(api_key=Config.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=25000))` with a 25-second per-request timeout.
  * Iterates through `OCR_MODELS` (`["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]`) with `_generate_with_fallback`, requiring non-empty JSON object output (`response_mime_type="application/json"`, `temperature=0.1`) and logging model attempts/errors immediately (`flush=True`).
  * Runs `_optimize_file_bytes` on raster images (converting non-RGB modes to `RGB`, downscaling max dimension to `1600px` via `Image.Resampling.LANCZOS`, and compressing as JPEG at `quality=82`) while passing `application/pdf` bytes directly for native PDF parsing.
  * Normalizes `purchase_date` via `_parse_purchase_date` (falling back to `date.today()` if missing/invalid) and enriches line items via `_enrich_items` with `ObjectId` string IDs, calendar-accurate `brand_warranty_expiry` (`purchase_date + relativedelta(months=...)`), and warranty `status` (`expired`, `expiring_soon` within 14 days, `active`, or `none`).
* **`app/services/storage.py`**  
  Handles writing uploaded files and generated artifacts to disk, generating unique filenames, and resolving public `/uploads/...` URLs.
* **`app/services/export_import.py`**  
  Implements CSV serialization/deserialization (handling row validation, skipped rows, and error reporting) and proof PDF generation.
* **`app/services/auth_service.py`**  
  Handles password hashing/verification, JWT access/refresh token creation and decoding, and user session validation.

---

### 3.6 `app/utils/`

* **`app/utils/responses.py`**  
  Formats consistent JSON error payloads (`detail`, `message`, `code`, and optional `field`) and HTTP status codes consumed by the client API error parser.
* **`app/utils/security.py`**  
  Provides redaction helpers for hiding payment identifiers and phone numbers on shared proofs and verifying resource ownership.

---

## 4. Operational & Deployment Notes

* **Terminal OCR Status Updates:** Any background worker or route calling `parse_receipt_image` should catch exceptions and transition the receipt document to `status: "failed"` with a descriptive error message so clients polling `GET /api/v1/receipts/{id}` terminate cleanly rather than polling indefinitely.
* **Persistent Secrets & Single-Worker Behavior:** Keep `JWT_SECRET` static across deployments (32+ bytes) so existing sessions do not fail with `401` after a container restart, and account for container restarts/redeploys terminating in-flight background tasks.