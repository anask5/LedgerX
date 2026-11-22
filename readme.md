# LedgerX

<div align="center">

[![Android APK](https://img.shields.io/badge/Android-Preview%20APK-10B981?style=for-the-badge&logo=android&logoColor=white)](https://ledgerx.fs0ciety.in)
[![Expo](https://img.shields.io/badge/Expo-React%20Native-06B6D4?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![Python](https://img.shields.io/badge/Python-Backend%20API-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://receiptwise1.onrender.com/api/v1)
[![Google GenAI](https://img.shields.io/badge/OCR-Gemini%203-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Package](https://img.shields.io/badge/Package-com.ledgerx.app-09090B?style=for-the-badge&style=flat-square&labelColor=18181E&color=10B981)](#)

**Smart Receipt Vault, Multimodal OCR Extraction, Warranty Tracking, CSV Import/Export & Redacted Proof Sharing**

[Download Android APK](https://ledgerx.fs0ciety.in) • [Architecture](#architecture) • [Local Setup](#local-setup) • [Deployment](#deployment)

</div>

---

## Overview

**LedgerX** (`com.ledgerx.app`) helps users turn raw paper receipts, mobile photos, and PDF invoices (including Indian GST tax invoices) into structured, searchable records. Built with an **Obsidian (`#09090B`)**, **Emerald (`#10B981`)**, and **Cyan (`#06B6D4`)** interface, it combines a React Native / Expo client, a Python API backend, and Gemini multimodal extraction.

### Key Features

* **Multimodal Receipt & Invoice OCR:** Upload images or PDFs to extract merchant details, dates, totals, taxes, payment modes, and itemized entries with warranty tracking.
* **Warranty & Expiry Tracking:** Automatically calculates warranty expiration dates (`relativedelta(months=...)`) and surfaces active, expiring-soon, and expired items.
* **Privacy-Safe Proof Sharing:** Export formatted proof PDFs or generate expiring share links (`24h`, `7d`, `30d`) with toggles to redact payment details and phone numbers, plus instant revocation.
* **CSV Import & Export:** Filter and export receipts to `.csv` or bulk-import existing records with row-level validation and error reporting.
* **Vault Organization:** Organize records with folders, tags, search/sorting, and optional app lock controls.

---

## Architecture

```text
ledgerx/
├── client/                  # Expo / React Native / Web client (com.ledgerx.app)
│   ├── src/
│   │   ├── api/             # API client, receipts, share/export/import calls
│   │   └── lib/             # Date formatting & helpers
│   ├── app.json             # Expo & EAS configuration
│   └── eas.json             # EAS build profiles (preview APK)
├── server/                  # Python backend API (FastAPI / Flask + MongoDB)
│   ├── app/
│   │   ├── config.py        # Environment config (Gemini key, JWT secret, DB)
│   │   ├── models/          # User, receipt, reminder, and share link models
│   │   ├── routes/          # Auth, receipts, reminders, folders, exports/imports, share
│   │   ├── services/        # Gemini OCR parser, storage, CSV/PDF export, auth
│   │   └── utils/           # Response helpers & redaction/security utilities
│   └── uploads/             # Uploaded files, CSV exports, and generated proof PDFs
└── README.md
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Client** | React Native, Expo, Expo Router, TanStack Query, React Native Reanimated, TypeScript |
| **Backend** | Python, Gunicorn / Uvicorn, MongoDB (`bson.ObjectId`), `python-dateutil`, `Pillow` |
| **OCR Engine** | Google GenAI SDK (`google-genai`) — `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.8-flash` |

---

## Local Setup

### 1. Server Setup (`server/`)

```bash
cd server
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `server/` (see `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=replace_with_a_strong_32_plus_byte_secret_key
MONGODB_URI=your_mongodb_connection_string
```

Start the server:

```bash
# Example with Gunicorn / Uvicorn depending on your entry point
gunicorn run:app --bind 0.0.0.0:10000
```

### 2. Client Setup (`client/`)

```bash
cd client
npm install
npx expo start
```

Set your environment variables (or `eas.json` env block):



---

## Building the Android APK & Hosting

1. Initialize and build the Android preview APK via EAS:

```bash
cd client
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

---
