# Quotify

Quotify is a quotation and billing workspace for Door2Door Interiors. Users sign in with a password or Google, manage clients and business profiles, save itemized quotations and bills to Google Sheets, share public document links, and export PDFs in the browser. Administrators manage users and reset passwords.

## Structure

- `my-app/`: React 19 frontend; deploy from this directory to Vercel.
- `backend-go/`: Go 1.22/Gin API; deploy from this directory to Render.
- `render.yaml`: Render service definition.

The frontend calls the Render API directly in production at `https://quotify-i62o.onrender.com` and sends requests with credentials. Vercel hosts the frontend and the Blob upload authorization function.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/ping` or `/api/v1/ping` | Uptime check (keeps the Render instance awake) |
| GET | `/api/v1/auth/health` | Check auth configuration |
| POST | `/api/v1/auth/login` | Validate credentials and start session |
| GET | `/api/v1/auth/google/start` | Start Google sign-in |
| GET | `/api/v1/auth/google/callback` | Complete Google sign-in |
| POST | `/api/v1/auth/logout` | Clear session |
| GET | `/api/v1/auth/me` | Read current session |
| GET | `/api/v1/clients` | List the current user's clients |
| POST | `/api/v1/clients` | Create a client |
| GET | `/api/v1/clients/:id` | Read a client owned by the current user |
| GET | `/api/v1/clients/:id/documents` | List the owner's quotations and bills linked to this client |
| PUT | `/api/v1/clients/:id` | Update a client |
| PATCH | `/api/v1/clients/:id/status` | Archive or restore a client |
| DELETE | `/api/v1/clients/:id` | Delete a client owned by the current user |
| GET | `/api/v1/employees` | List the current user's employees |
| POST | `/api/v1/employees` | Create an employee |
| GET | `/api/v1/employees/:id` | Read an employee owned by the current user |
| PUT | `/api/v1/employees/:id` | Update an employee |
| DELETE | `/api/v1/employees/:id` | Delete an employee owned by the current user |
| PATCH | `/api/v1/quotations/:id/status` | Update quotation lifecycle or payment status and record payments |
| POST | `/api/v1/quotations/:id/share` | Create a public quotation link |
| DELETE | `/api/v1/quotations/:id/share` | Revoke a public quotation link |
| POST | `/api/v1/quotations/:id/convert-to-bill` | Create a bill from a quotation |
| PATCH | `/api/v1/bills/:id/status` | Update bill or payment status and record payments |
| POST | `/api/v1/bills/:id/share` | Create a public bill link |
| DELETE | `/api/v1/bills/:id/share` | Revoke a public bill link |
| GET | `/api/v1/public/share/:token` | Read a publicly shared quotation or bill |
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

Quotation, bill, and client ownership is enforced by the backend from the signed session cookie; the client does not submit an owner identity.

Client listing accepts a `q` search query. Client status updates use `?status=active` or `?status=archived`. Client deletion removes only the row for the authenticated owner; linked documents keep their stored client name but no longer appear in that client's history. Document status updates accept JSON with optional `status`, `paymentStatus`, and `payments` fields. Quotations and bills both support payment data on their `/status` endpoint: `{"status":"accepted"}` updates lifecycle, `{"status":"issued","paymentStatus":"paid"}` updates both, and a `payments` array of `{date, amount}` entries re-derives the payment status. Client history returns `quotation` and `bill` arrays linked by client ID.

Quotation statuses: `draft`, `sent`, `viewed`, `accepted`, `declined`, `cancelled` (a public share view auto-marks a quotation `viewed`). Bill statuses: `draft`, `issued`, `cancelled`. Payment statuses: `unpaid`, `partially_paid`, `paid`, `overdue` for both quotations and bills. Payment status is derived from recorded payments but can be overridden; a due date does not automatically mark a bill overdue, and `cancelled` documents hide all payment details. Declined or cancelled quotations cannot convert to bills; converting a quotation carries its recorded payments into the new bill with a derived payment status.

## Google Sheets

Use one spreadsheet shared with the service account. User records are read from `Users!A2:J`:

| A | B | C | D | E | F | G | H | I | J |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | username | bcrypt_hash | display_name | role | status | updated_at | legacy_password | google_subject | google_email |

All worksheet ranges are hard-coded in the repository, including `Users!A2:J`; there is no `GOOGLE_SHEET_RANGE` variable to override them.

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

Metadata follows the existing A:Q columns:

- `Quotations!R:X`: `status, client_id, share_link_id, viewed_at, sent_at, template_id, source_quotation_id`
- `Quotations!Y:Z`: `payment_status` and a JSON `payments` array of `{date, amount}` records that drives the derived payment status
- `Bills!R:W`: `status, client_id, source_quotation_id, payment_status, due_date, template_id`
- `Bills!X`: a JSON `payments` array of `{date, amount}` records that drives the derived payment status

The `Clients` tab uses: `client_id, owner_id, name, phone, email, address, notes, created_at, updated_at, status`.
The `Employee` tab uses: `employee_id, owner_id, name, phone, email, address, designation, notes, status, created_at, updated_at`. Like clients, employee records are owner-scoped and read from `Employee!A2:K`, but they are never tagged to quotations or bills. New employees default to `active`; updates accept only `active` or `inactive`.
The `ShareLinks` tab uses: `share_id, owner_id, document_type, document_id, token_hash, created_at, expires_at, revoked_at, first_viewed_at, last_viewed_at, view_count`. All five `ShareLinks` date columns are stored as Asia/Kolkata timestamps formatted `DD-MM-YYYY HH:MM:SS`. New share links expire 10 minutes after creation; legacy rows without `expires_at` are treated as expiring 10 minutes after `created_at`, and expired or revoked links return `410 Gone`.
Keep the existing `template_id` column positions for compatibility. This checkout does not implement template routes, repositories, or UI, and does not require a `Templates` tab.

Existing A:Q quotation and bill rows remain readable. Public quotation and bill links are view-only, share tokens are stored as hashes, and WhatsApp sharing opens a prefilled browser draft without automated sending. Bill and quotation share pages also receive `paymentStatus` and the raw `payments` record so their Received/Pending summary matches the app.

The `BusinessProfiles` tab must keep row 1 in this order:

```text
user_id, business_name, logo_url, phone, email, address, gstin, quote_prefix, terms, updated_at, website
```

Each user has one profile row. `logo_url` contains a public Vercel Blob URL, never image data. The service account needs Editor access for business profile persistence.

Append `website` as the header in `BusinessProfiles!K1`; keep A:J unchanged. Reads and writes now use A:K, and older rows without K remain supported. The profile API accepts an optional `website`: omitted values preserve the stored website, while an empty string clears it. Bare domains are normalized to HTTPS; only HTTP/HTTPS addresses are accepted. Deploy the backend support before a frontend that saves this field.

## Quotation and Bill PDF Design

Quotation downloads use the green A4 template: large profile logo (or business-name fallback), quotation reference/date, four client-detail sections, numbered item rows, a totals panel, pale house watermark, and profile contact footer including the optional website. Client details are ordered Client, Phone, Project, Address; the rightmost Address column is intentionally widest for long locations. Text wraps and additional pages repeat table headings and contact footers; totals stay together on the final page. GST is omitted when disabled. No terms or signatures are added.

Bill downloads use the same A4 layout in blue with a `BILL / INVOICE` header and bill numbering. Quotation downloads and bill downloads that are partially paid (and not cancelled) show a theme-colored Payment Summary card (blue for bills, green for quotations) with a Partially Paid badge, Subtotal, optional GST, a dark Total Due band, Amount Received, and a pale Balance Due row. Received and balance amounts use the existing recorded-payment calculations. Cancelled documents and documents with other payment statuses show ordinary totals without received/balance rows. The entire summary stays together on the final page.

Both PDF footers align icons and contact text blocks around a common vertical center, so multiline addresses remain aligned with single-line phone/email/website fields. Generation remains browser-side using a shared on-demand jsPDF/AutoTable renderer. Calculations, document numbering, and lowercase client-based filenames are preserved. Authenticated previews and public share layouts retain their existing designs. These implementations have not been tested, built, or visually verified; verification was explicitly skipped for these changes.

## Business Logos

Business logos are uploaded directly from the browser to Vercel Blob. The Vercel function at `/api/blob/upload` checks the existing signed session before issuing an upload token, permits JPEG, PNG, and WebP files up to 200 KB, and the profile save stores the returned public URL in `BusinessProfiles`. The app displays every uploaded logo inside the same fixed-size topbar frame.

Connect a public Vercel Blob store to the `my-app/` Vercel project. Vercel creates `BLOB_READ_WRITE_TOKEN` automatically. Set `QUOTIFY_API_URL` only if the upload authorization function must use a backend URL other than its current Render default.

## Local Setup

Prerequisites: Node.js/npm, Go 1.22+, a Google Cloud service account with Sheets API access, and a shared spreadsheet.

Create `backend-go/.env` from `backend-go/.env.example`:

```env
GOOGLE_SHEET_ID=your-google-spreadsheet-id
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

Run each command from the repository root in a separate terminal:

```bash
cd backend-go && go run ./cmd/server
cd my-app && npm install && npm start
```

The API runs on `http://localhost:8000`; the frontend runs on `http://localhost:3000`.

Password sign-in does not require Google OAuth configuration; the Google sign-in button requires the OAuth settings and registered callback. See [frontend setup](my-app/README.md) for environment selection. Logo uploads additionally require the Vercel authorization function and Blob configuration; the React development server alone does not run that function.

## Deployment

Deploy `my-app/` to Vercel and connect the public Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is available. The browser calls the Render API directly at `https://quotify-i62o.onrender.com`; the Vercel `/api/blob/upload` function remains responsible only for authorizing Blob uploads. Deploy `backend-go/` using `render.yaml`; hosted configuration needs `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `AUTH_SESSION_SECRET`, `COOKIE_SECURE=true`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URL=https://quotify-i62o.onrender.com/api/v1/auth/google/callback`, `OAUTH_FRONTEND_URL=https://quotify-net.vercel.app/`, and the frontend origin in `CORS_ALLOWED_ORIGINS`.

Register both `http://localhost:8000/api/v1/auth/google/callback` and `https://quotify-i62o.onrender.com/api/v1/auth/google/callback` as authorized redirect URIs in the Google Cloud OAuth client.

## Behavior Notes

- Select an existing client in a quotation or bill to fill their contact details and save a stable client link. The client directory shows linked documents and provides shortcuts to create quotations and bills. Older documents can be linked by editing and selecting a client.
- The employees page keeps team contact details (name, phone, email, address, designation, notes, status) in an owner-scoped directory with search; each row offers WhatsApp and call shortcuts, employees can be marked inactive (hidden by default) instead of deleted, and employee records are never linked to quotations or bills.
- Saved document libraries provide a per-library search box (by username, client name, or project) and collapsible tiles; status and payment controls are revealed when a tile is expanded. Quotations support accepted and declined decisions; declined and cancelled quotations cannot be converted to bills. Opening a public share link auto-marks the quotation `viewed`. Quotations and bills track recorded payments (date and amount) with a derived payment status; the Total/Received/Pending summary renders for `partially_paid` documents on the library, preview, downloaded PDF, and public share link, and `cancelled` documents hide all payment details. Converting a quotation to a bill carries the quotation's recorded payments into the bill.
- Popup close buttons and click-away return to the page the popup opened from. PDF downloads use lowercase filenames built from the client name (e.g. `quotation-amit-06sep.pdf`) and wrap the business address across multiple lines in the footer.
- The business profile page edits contact and logo fields; quote prefix and default terms are still stored in `BusinessProfiles!A:J` but are no longer editable in the UI (PDF output falls back to the stored values or built-in defaults).
- Client links and bill due dates can be cleared when editing; older API clients that omit those fields preserve existing metadata. Cross-origin API requests allow PATCH for status changes.
- Sessions use an HTTP-only `quotify_session` cookie signed with HMAC and expire after one hour.
- New quotation dates use `Asia/Kolkata`.
- The active draft is stored in browser session storage.
- Drafts are scoped by user and document type.
- Totals, preview rendering, and PDF generation are client-side.
- Analytics events are privacy-safe and must not contain credentials, client details, or quotation content.

## Current Limitations

- Document templates are not implemented.
- Share revocation has API support and frontend service helpers, but no UI control.
- Client, quotation, and bill libraries have per-library search; the admin user list and employee directory also have search.
- Bill due dates appear in the editor, library, and authenticated preview; the PDF generator does not currently print them.

## Checks

From `my-app/`, run `npm test -- --watchAll=false --runInBand` and `npm run build`. From `backend-go/`, run `go test ./...`. Use `npm test` for interactive watch mode.

See [AGENTS.md](AGENTS.md) for operational notes, [backend setup](backend-go/README.md), and [frontend setup](my-app/README.md). When features, routes, schemas, or setup change, update this README and the affected service README in the same change. Verify claims against code and keep unfinished capabilities in Current Limitations.
