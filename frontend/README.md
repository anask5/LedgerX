# ReceiptWise — Frontend (React Native + Expo)

ReceiptWise is an AI-powered receipt tracking, warranty management, and proof-of-purchase sharing mobile application for Android and iOS.

---

## 🚀 Tech Stack

- **Framework:** React Native + Expo (SDK 58)
- **Language:** TypeScript (`strict: true`)
- **Navigation:** `expo-router` (file-based routing)
- **UI System:** `react-native-paper` (Material Design 3)
- **Server State & Caching:** `@tanstack/react-query`
- **Form Management & Validation:** `react-hook-form` + `zod`
- **Secure Storage:** `expo-secure-store`
- **Image Optimization:** `expo-image-manipulator`
- **Hardware & Native:** `expo-image-picker`, `expo-document-picker`, `expo-local-authentication`, `expo-clipboard`, `expo-sharing`

---

## 📁 Project Structure

```
mobile/
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── .env                             # EXPO_PUBLIC_API_URL
├── app/                             # expo-router routes
│   ├── _layout.tsx                  # Root providers (QueryClient, Paper, Auth)
│   ├── (auth)/                      # Authentication group
│   │   ├── _layout.tsx
│   │   ├── login.tsx                # S1: Login
│   │   ├── signup.tsx               # S1: Signup
│   │   └── forgot-password.tsx      # S1: Forgot password
│   ├── (tabs)/                      # Bottom tab navigator
│   │   ├── _layout.tsx
│   │   ├── index.tsx                # S2: Home (expiring soon + recent receipts)
│   │   ├── vault.tsx                # S6: Vault (search, infinite scroll, categories)
│   │   ├── add.tsx                  # S3: Add (Camera / Gallery / PDF)
│   │   ├── reminders.tsx            # S11: Reminders (Upcoming / Expiring / Expired)
│   │   └── settings.tsx             # S12: Settings (Profile, Biometrics, Export CSV)
│   ├── receipt/
│   │   └── [id].tsx                 # S8: Receipt detail & actions
│   ├── review/
│   │   └── [id].tsx                 # S5: Review & Edit extracted fields
│   ├── share/
│   │   └── [id].tsx                 # S9: Share Proof (PDF download & share links)
│   ├── folders.tsx                  # S10: Folders & Tags management
│   ├── filters.tsx                  # S7: Search & Filters modal sheet
│   └── processing/
│       └── [id].tsx                 # S4: Real-time OCR polling screen
└── src/
    ├── api/
    │   ├── client.ts                # Fetch wrapper with single-flight JWT refresh
    │   ├── auth.ts                  # Auth API endpoints
    │   ├── receipts.ts              # Receipts CRUD & file upload
    │   ├── items.ts                 # Receipt items & warranty updates
    │   ├── folders.ts               # Folders CRUD
    │   ├── tags.ts                  # Tags CRUD
    │   ├── reminders.ts             # Reminders & snooze
    │   ├── share.ts                 # Share links, PDF proof & CSV export
    │   └── types.ts                 # TypeScript schemas matching backend models
    ├── components/
    │   ├── ReceiptCard.tsx          # Card with thumbnail, store, date & status
    │   ├── StatusBadge.tsx          # Active / Expiring soon / Expired badge
    │   ├── FieldRow.tsx             # Editable row with 'Suggested' flag
    │   ├── ItemRow.tsx              # Receipt item with warranty & serial number
    │   ├── EmptyState.tsx           # Empty state with icon and action button
    │   ├── LoadingSkeleton.tsx      # Skeleton loader placeholder
    │   ├── ErrorView.tsx            # Error screen with retry button
    │   └── ImageZoom.tsx            # Pinch/tap zoomable receipt preview modal
    ├── hooks/
    │   ├── useAuth.tsx              # Auth state & session lifecycle
    │   ├── useReceipts.ts           # Infinite query list with search/filter
    │   ├── useReceipt.ts            # Single receipt query with polling on processing
    │   ├── useUpload.ts             # Image optimization & multipart upload
    │   ├── useReminders.ts          # Reminders queries by tab
    │   └── useAppLock.ts            # Biometric lock after 30s in background
    ├── lib/
    │   ├── secureStore.ts           # expo-secure-store token manager
    │   ├── formatINR.ts             # ₹1,23,456.78 (Indian comma notation)
    │   ├── formatDate.ts            # DD/MM/YYYY & relative deadline helpers
    │   ├── imageOptimizer.ts        # Auto resize (2000px) & 0.8 JPEG compression
    │   └── validation.ts            # Zod validation schemas
    └── theme.ts                     # Material Design 3 theme (#0F766E teal)
```

---

## 🔌 Connecting to the Backend

The frontend is strictly decoupled and expandable to any backend implementing REST APIs:

1. Copy `.env` or set:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_BACKEND_HOST>:8000/api/v1
   ```
2. The API client in `src/api/client.ts` automatically attaches the JWT Bearer token from `SecureStore` to requests.
3. If an endpoint responds with `401 Unauthorized`, it triggers a single-flight token rotation via `POST /auth/refresh` and seamlessly retries the failed request.

---

## 🛡️ Warranty & Vault Architecture

ReceiptWise structures receipts with high-fidelity tracking:
- **Per-Item Warranty:** Warranties are tracked at the item level. A single receipt with multiple items can have separate warranty horizons.
- **Dual Coverage Layers:**
  - **Brand Warranty:** Standard manufacturer warranty (`brand_warranty_months`, `brand_warranty_expiry`).
  - **Extended Warranty:** Store or third-party add-on warranty (`extended_warranty_months`, `extended_warranty_expiry`).
- **User-Defined Durations:** No assumptions based on item category. Users select or enter duration in months; the application automatically calculates expiry dates from the purchase date.
- **Image Quality Checks:** Checks resolution and flags low-confidence OCR results to ensure maximum data accuracy.
- **Receipt Metadata:** Captures store address, contact number, invoice/receipt number, subtotal, tax breakdown, and confidence scores matching standard PostgreSQL vault schemas.

---

## 🏃‍♂️ Running the Project

```bash
cd mobile

# Start the Expo development server
npx expo start

# For Android
npx expo start --android

# For iOS
npx expo start --ios

# For Web
npx expo start --web
```
