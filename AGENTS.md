# Quotify Agent Notes

Keep this file operational and short. The root `README.md` is the source of truth for setup and deployment; inspect code before trusting either document.

Update the root and affected service README files alongside feature, API, schema, configuration, or workflow changes. Update this file when routing, contracts, guardrails, or checks change. Verify documentation against code; distinguish implemented UI, API-only support, and missing features.

## Product

Two-service quotation app for Door2Door Interiors:

- `my-app/`: React 19 frontend, deployed from Vercel.
- `backend-go/`: Go/Gin API, deployed on Render.
- Google Sheets stores users, clients, saved quotations, bills, share links, and business profiles.
- Vercel Blob stores uploaded business logos; Google Sheets stores only their public URLs.
- The browser calculates, previews, and exports PDFs.

## Request Routing

- Auth/session: `backend-go/internal/handlers/auth.go`, `google_auth.go`, and `backend-go/internal/sheets/credentials.go`.
- Quotation API/ownership: `backend-go/internal/handlers/quotations.go`, `backend-go/internal/sheets/quotations.go`.
- Bill API/ownership: `backend-go/internal/handlers/bills.go`, `backend-go/internal/sheets/bills.go`.
- Clients/history: `backend-go/internal/handlers/clients.go`, `backend-go/internal/sheets/clients.go`, and `my-app/src/components/Clients.js`. Delete is `DELETE /api/v1/clients/:id`; the archive `PATCH` endpoint remains for compatibility but the UI exposes delete, not archive/restore.
- Client autofill: `my-app/src/components/ClientSelector.js`; selection and document creation are wired in `my-app/src/App.js`.
- Document/payment status controls: `my-app/src/components/DocumentStatus.js`, `my-app/src/config/statuses.js`, and quotation/bill handlers.
- Public shares: `backend-go/internal/handlers/share_links.go` and `backend-go/internal/sheets/share_links.go`. Template routes and implementations are absent in this checkout; preserve existing template metadata columns for compatibility.
- Business profiles: `backend-go/internal/handlers/business_profile.go`, `backend-go/internal/sheets/business_profiles.go`; the "Getting started" onboarding guide `my-app/src/components/UserGuide.js` renders behind a toggle button on the Business Profile page.
- Admin users: `backend-go/internal/handlers/admin_users.go`, `backend-go/internal/sheets/credentials.go`.
- Routes/CORS: `backend-go/internal/routes/routes.go`.
- Frontend orchestration: `my-app/src/App.js`.
- Frontend API calls: `my-app/src/services/`.
- Draft persistence: `my-app/src/utils/storage.js`.
- Quotation rules: `my-app/src/config/quotation.js` and `my-app/src/utils/quotation.js`.
- UI: `my-app/src/components/` and `my-app/src/App.css`.
- Shared UI primitives: `ModalHeader.js` (modal headers for preview and library modals), `ActionButton.js` (colorful labeled pills), `IconButton.js` (all icon-only controls), `ActionIcon.js` (SVG icon paths).
- PDF: `my-app/src/utils/pdf.js`.
- Logo upload authorization: `my-app/api/blob-upload.js`.

## Current Contracts

- Cookie: `quotify_session`, HTTP-only, HMAC-signed, one-hour lifetime.
- Login reads `Users!A2:J`; deployment config sets `GOOGLE_SHEET_RANGE` to `Users!A:J`. Columns are `id, username, bcrypt_hash, display_name, role, status, updated_at, legacy_password, google_subject, google_email`.
- Authentication verifies bcrypt hashes first and uses the legacy plaintext password column only as a compatibility fallback.
- Authenticated quotation requests derive the owner from the signed cookie; list/get/update/delete operations only use rows owned by that username.
- Quotation rows preserve A:Q and append R:X metadata: `status, client_id, share_link_id, viewed_at, sent_at, template_id, source_quotation_id`.
- `items_json` contains the full editable quotation payload.
- Bill rows preserve A:Q and append R:W metadata: `status, client_id, source_quotation_id, payment_status, due_date, template_id`, with a JSON `payments` array (date/amount records) in column X.
- Client history (`GET /api/v1/clients/:id/documents`) returns owner-scoped `quotation` and `bill` arrays matched by client ID, never by client name. Submitted client IDs must belong to the authenticated owner.
- Document updates preserve client links and bill due dates when omitted; explicit empty strings clear them. Nonempty due dates use valid `YYYY-MM-DD` dates. Reopening documents takes status/link/due-date metadata from server fields rather than stale `items_json` metadata.
- New documents start as `draft`; bills start `unpaid`. Status PATCH endpoints control lifecycle/payment changes. Quotation statuses are `draft, sent, viewed, accepted, declined, cancelled`; opening a public share URL auto-marks the quotation `viewed`. Declined or cancelled quotations cannot convert to bills. Bill lifecycle and payment statuses are separate; payment status is derived from recorded `payments` (unpaid/partially_paid/paid) but can be overridden (e.g. `overdue`) and is hidden for `cancelled` bills.
- Business profile rows use `BusinessProfiles!A:J`: `user_id, business_name, logo_url, phone, email, address, gstin, quote_prefix, terms, updated_at`.
- Business logos accept JPEG, PNG, and WebP files up to 200 KB. Uploads require an authenticated session and use `/api/blob/upload`; only the resulting Blob URL is saved in `logo_url`.
- New dates use `Asia/Kolkata`; the active draft uses browser `sessionStorage`.
- Preserve `credentials: 'include'` on frontend requests.
- CORS must allow PATCH for client, document, payment, and admin status updates.
- Production frontend API calls use `https://quotify-i62o.onrender.com` directly; preserve `credentials: 'include'` and Render CORS. The Vercel `/api/blob/upload` function remains the separate Blob upload authorization path.
- Analytics must not include credentials, client data, or quotation content.
- Public share tokens are stored as hashes; public quotation views are read-only and sanitized.
- Popup close buttons and click-away go back to the previous page they opened from (never the homepage).
- PDF downloads use lowercase filenames built from the client name (e.g. `quotation-amit-06sep.pdf`), not the username.
- WhatsApp sharing uses browser-generated `wa.me` draft links; no WhatsApp credentials or automated sending are used.

## Configuration

Backend: `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE`, `GOOGLE_SERVICE_ACCOUNT_FILE` or `GOOGLE_SERVICE_ACCOUNT_JSON`, `AUTH_SESSION_SECRET`, `COOKIE_SECURE`, `CORS_ALLOWED_ORIGINS`, `AUTH_DEBUG`, `PORT`. Backend loads `backend-go/.env` (copy from `.env.example`), but existing environment variables take precedence over `.env`.

Google sign-in: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URL`, `OAUTH_FRONTEND_URL`, optional `GOOGLE_ALLOWED_DOMAINS`.

Frontend: optional `REACT_APP_ENV` (`local`, `development`, `production`). Vercel requires `BLOB_READ_WRITE_TOKEN` for logo uploads; Vercel creates it when the Blob store is connected. `QUOTIFY_API_URL` optionally overrides the backend URL used by the upload authorization function.

The service account needs Editor access to the spreadsheet for saved records and user administration. Keep `.env` and service-account files out of source control.

## Guardrails

- Do not claim or implement admin/user-management features without checking that routes, handlers, and components exist in this checkout.
- Preserve the existing `Quotations` column order and `items_json` compatibility.
- Preserve the `Bills!A:Q` column order and `items_json` compatibility.
- Preserve appended quotation/bill metadata positions and tolerate legacy rows without appended columns.
- Preserve the `BusinessProfiles!A:J` column order; never store image data in the sheet.
- Reuse the shared UI primitives: close/plus buttons go through `IconButton`, preview export pills through `ActionButton` with `color-*` classes, modal headers through `ModalHeader`. Do not reintroduce hand-rolled `x` buttons.
- For multi-user work, keep server-side owner enforcement and make browser draft state user-scoped; never rely on frontend hiding alone.
- Local: `http://localhost:3000` frontend, `http://localhost:8000` backend; local cookies require `COOKIE_SECURE=false`.

## Checks

```text
cd my-app && npm test
cd my-app && npm run build
cd backend-go && go test ./...
```

For a noninteractive frontend test run, use `npm test -- --watchAll=false --runInBand`. Metadata compatibility tests are in `backend-go/internal/handlers/document_metadata_test.go` and `my-app/src/utils/quotation.test.js`; client selection and status controls have component tests beside their implementations.
