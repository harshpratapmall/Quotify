# Quotify

Quotify is a quotation workspace for Door2Door Interiors. Users sign in with credentials held in Google Sheets, create itemized quotations, preview them, save them to Google Sheets, and export printable PDFs in the browser.

## Structure

- `my-app/`: React 19 frontend; deploy from this directory to Vercel.
- `backend-go/`: Go 1.22/Gin API; deploy from this directory to Render.
- `render.yaml`: Render service definition.

The frontend calls the Render API directly in production at `https://quotify-i62o.onrender.com` and sends requests with credentials. Vercel hosts the frontend and the Blob upload authorization function.

## API

| Method | Path | Purpose |
| GET | `/api/v1/ping` | Uptime check |
| GET | `/api/v1/auth/health` | Check auth configuration |
| POST | `/api/v1/auth/login` | Validate credentials and start session |
| GET | `/api/v1/auth/google/start` | Start Google sign-in |
| GET | `/api/v1/auth/google/callback` | Complete Google sign-in |
| POST | `/api/v1/auth/logout` | Clear session |
| GET | `/api/v1/auth/me` | Read current session |
| GET | `/api/v1/clients` | List the current user's clients |
| POST | `/api/v1/clients` | Create a client |
| PUT | `/api/v1/clients/:id` | Update a client |
| PATCH | `/api/v1/clients/:id/status` | Archive or restore a client |
| GET | `/api/v1/templates` | List document templates |
| POST | `/api/v1/templates` | Create a document template |
| PUT | `/api/v1/templates/:id` | Update a document template |
| DELETE | `/api/v1/templates/:id` | Delete a document template |
| PATCH | `/api/v1/quotations/:id/status` | Update quotation lifecycle status |
| POST | `/api/v1/quotations/:id/share` | Create a public quotation link |
| DELETE | `/api/v1/quotations/:id/share` | Revoke a public quotation link |
| POST | `/api/v1/quotations/:id/convert-to-bill` | Create a bill from a quotation |
| PATCH | `/api/v1/bills/:id/status` | Update bill or payment status |
| GET | `/api/v1/public/share/:token` | Read a public quotation link |
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

Use one spreadsheet shared with the service account. User records are read from `Users!A2:J`; deployment configuration sets `GOOGLE_SHEET_RANGE=Users!A:J`:

| A | B | C | D | E | F | G | H | I | J |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | username | bcrypt_hash | display_name | role | status | updated_at | legacy_password | google_subject | google_email |

Passwords are verified with the bcrypt hash in column C. Column H is a legacy plaintext compatibility fallback and must not be exposed by the API; remove it after all existing accounts have been migrated.

Google sign-in uses the verified, immutable Google subject in column I. A new verified Google account is automatically added as an active `user` with a generated Quotify ID and no password. Set `GOOGLE_ALLOWED_DOMAINS` to a comma-separated domain allowlist when access should be restricted.

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

Phase 1 appends metadata after the existing A:Q columns:

- `Quotations!R:X`: `status, client_id, share_link_id, viewed_at, sent_at, template_id, source_quotation_id`
- `Bills!R:W`: `status, client_id, source_quotation_id, payment_status, due_date, template_id`

The `Clients` tab uses: `client_id, owner_id, name, phone, email, address, notes, created_at, updated_at, status`.
The `ShareLinks` tab uses: `share_id, owner_id, document_type, document_id, token_hash, created_at, expires_at, revoked_at, first_viewed_at, last_viewed_at, view_count`.
The `Templates` tab uses: `template_id, owner_id, name, document_type, primary_color, secondary_color, accent_color, terms, footer, logo_url, is_default, created_at, updated_at, status`.

Existing A:Q quotation and bill rows remain readable. Public quotation links are view-only, share tokens are stored as hashes, payment status is manually recorded, and WhatsApp sharing opens a prefilled browser draft without automated sending.

The `BusinessProfiles` tab must keep row 1 in this order:

```text
user_id, business_name, logo_url, phone, email, address, gstin, quote_prefix, terms, updated_at
```

Each user has one profile row. `logo_url` contains a public Vercel Blob URL, never image data. The service account needs Editor access for business profile persistence.

## Business Logos

Business logos are uploaded directly from the browser to Vercel Blob. The Vercel function at `/api/blob/upload` checks the existing signed session before issuing an upload token, permits JPEG, PNG, and WebP files up to 200 KB, and the profile save stores the returned public URL in `BusinessProfiles`. The app displays every uploaded logo inside the same fixed-size topbar frame.

Connect a public Vercel Blob store to the `my-app/` Vercel project. Vercel creates `BLOB_READ_WRITE_TOKEN` automatically. Set `QUOTIFY_API_URL` only if the upload authorization function must use a backend URL other than its current Render default.

## Local Setup

Prerequisites: Node.js/npm, Go 1.22+, a Google Cloud service account with Sheets API access, and a shared spreadsheet.

Create `backend-go/.env` from `backend-go/.env.example`:

```env
GOOGLE_SHEET_ID=your-google-spreadsheet-id
GOOGLE_SHEET_RANGE=Users!A:J
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTH_DEBUG=false
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:8000/api/v1/auth/google/callback
OAUTH_FRONTEND_URL=http://localhost:3000/
GOOGLE_ALLOWED_DOMAINS=
```

`GOOGLE_SHEET_ID` is the ID between `/d/` and `/edit` in the spreadsheet URL. Use `GOOGLE_SERVICE_ACCOUNT_JSON` instead of the file path in hosted environments. Keep credentials out of source control.

Run the services:

```bash
cd backend-go && go run ./cmd/server
cd my-app && npm install && npm start
```

The API runs on `http://localhost:8000`; the frontend runs on `http://localhost:3000`.

## Deployment

Deploy `my-app/` to Vercel and connect the public Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is available. The browser calls the Render API directly at `https://quotify-i62o.onrender.com`; the Vercel `/api/blob/upload` function remains responsible only for authorizing Blob uploads. Deploy `backend-go/` using `render.yaml`; hosted configuration needs `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE=Users!A:J`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `AUTH_SESSION_SECRET`, `COOKIE_SECURE=true`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URL=https://quotify-i62o.onrender.com/api/v1/auth/google/callback`, `OAUTH_FRONTEND_URL=https://quotify-net.vercel.app/`, and the frontend origin in `CORS_ALLOWED_ORIGINS`.

Register both `http://localhost:8000/api/v1/auth/google/callback` and `https://quotify-i62o.onrender.com/api/v1/auth/google/callback` as authorized redirect URIs in the Google Cloud OAuth client.

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
