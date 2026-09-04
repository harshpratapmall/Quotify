# Quotify

Quotify is a quotation workspace for Door2Door Interiors. Users sign in with credentials held in Google Sheets, create itemized quotations, preview them, save them to Google Sheets, and export printable PDFs in the browser.

## Structure

- `my-app/`: React 19 frontend; deploy from this directory to Vercel.
- `backend-go/`: Go 1.22/Gin API; deploy from this directory to Render.
- `render.yaml`: Render service definition.

The frontend checks `GET /api/v1/auth/me`, sends API requests with cookies, and uses `my-app/vercel.json` to proxy production `/api/*` requests to Render.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/ping` | Uptime check |
| GET | `/api/v1/auth/health` | Check auth configuration |
| POST | `/api/v1/auth/login` | Validate credentials and start session |
| GET | `/api/v1/auth/me` | Read current session |
| POST | `/api/v1/auth/logout` | Clear session |
| GET | `/api/v1/business-profile` | Read the current user's business profile |
| PUT | `/api/v1/business-profile` | Create or update the current user's business profile |
| GET | `/api/v1/quotations` | List current owner's quotations |
| POST | `/api/v1/quotations` | Create quotation |
| GET | `/api/v1/quotations/:id` | Read current owner's quotation |
| PUT | `/api/v1/quotations/:id` | Update current owner's quotation |
| DELETE | `/api/v1/quotations/:id` | Delete current owner's quotation |
| GET | `/api/v1/bills` | List current owner's bills |
| POST | `/api/v1/bills` | Create bill |
| GET | `/api/v1/bills/:id` | Read current owner's bill |
| PUT | `/api/v1/bills/:id` | Update current owner's bill |
| DELETE | `/api/v1/bills/:id` | Delete current owner's bill |
| GET | `/api/v1/admin/users` | List users (administrator only) |
| POST | `/api/v1/admin/users` | Create a user (administrator only) |
| PATCH | `/api/v1/admin/users/:id/status` | Change a user's status (administrator only) |
| POST | `/api/v1/admin/users/:id/reset-password` | Reset a user's password (administrator only) |

Quotation ownership is enforced by the backend from the signed session cookie; the client does not submit an owner identity.

## Google Sheets

Use one spreadsheet shared with the service account. User records are read from `Users!A2:H`; deployment configuration sets `GOOGLE_SHEET_RANGE=Users!A:G` for compatibility with the required user columns:

| A | B | C | D | E | F | G | H |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | username | bcrypt_hash | display_name | role | status | updated_at | legacy_password |

Passwords are verified with the bcrypt hash in column C. Column H is a legacy plaintext compatibility fallback and must not be exposed by the API; remove it after all existing accounts have been migrated.

The `Quotations` tab must keep row 1 in this order:

```text
quotation_id, created_at, updated_at, owner, client_name, project_name, phone,
email, site_location, quote_date, scope_of_work, include_gst, gst_rate,
items_json, subtotal, tax, total
```

Each quotation occupies one row. `items_json` stores the complete editable payload; the other columns support review and filtering. The service account needs Editor access for quotation persistence.

The `Bills` tab must keep row 1 in this order:

```text
bill_id, created_at, updated_at, owner, client_name, project_name, phone,
email, site_location, bill_date, billing_notes, include_gst, gst_rate,
items_json, subtotal, tax, total
```

Bills use the same line-item payload and owner enforcement as quotations, while remaining in a separate worksheet and API collection.

The `BusinessProfiles` tab must keep row 1 in this order:

```text
user_id, business_name, logo_url, phone, email, address, gstin, quote_prefix, terms, updated_at
```

Each user has one profile row. `logo_url` contains a public Vercel Blob URL, never image data. The service account needs Editor access for business profile persistence.

## Business Logos

Business logos are uploaded directly from the browser to Vercel Blob. The Vercel function at `/api/blob/upload` checks the existing signed session before issuing an upload token, permits JPEG, PNG, and WebP files up to 2 MB, and the profile save stores the returned public URL in `BusinessProfiles`.

Connect a public Vercel Blob store to the `my-app/` Vercel project. Vercel creates `BLOB_READ_WRITE_TOKEN` automatically. Set `QUOTIFY_API_URL` only if the upload authorization function must use a backend URL other than its current Render default.

## Local Setup

Prerequisites: Node.js/npm, Go 1.22+, a Google Cloud service account with Sheets API access, and a shared spreadsheet.

Create `backend-go/.env` from `backend-go/.env.example`:

```env
GOOGLE_SHEET_ID=your-google-spreadsheet-id
GOOGLE_SHEET_RANGE=Users!A:G
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTH_DEBUG=false
```

`GOOGLE_SHEET_ID` is the ID between `/d/` and `/edit` in the spreadsheet URL. Use `GOOGLE_SERVICE_ACCOUNT_JSON` instead of the file path in hosted environments. Keep credentials out of source control.

Run the services:

```bash
cd backend-go && go run ./cmd/server
cd my-app && npm install && npm start
```

The API runs on `http://localhost:8000`; the frontend runs on `http://localhost:3000`.

## Deployment

Deploy `my-app/` to Vercel. Keep both its same-origin `/api/*` rewrite and the more-specific `/api/blob/upload` Vercel Function route in place. Connect the public Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is available. Deploy `backend-go/` using `render.yaml`; hosted configuration needs `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `AUTH_SESSION_SECRET`, `COOKIE_SECURE=true`, and the frontend origin in `CORS_ALLOWED_ORIGINS`.

## Behavior Notes

- Sessions use an HTTP-only `quotify_session` cookie signed with HMAC and expire after one hour.
- New quotation dates use `Asia/Kolkata`.
- The active draft is stored in browser session storage.
- Totals, preview rendering, and PDF generation are client-side.
- Analytics events are privacy-safe and must not contain credentials, client details, or quotation content.

## Checks

```bash
cd my-app && npm test
cd my-app && npm run build
cd backend-go && go test ./...
```

See `AGENTS.md` for concise code-routing notes. See `backend-go/README.md` for the backend-only quick reference.
