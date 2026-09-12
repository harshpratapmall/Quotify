# Quotify API

Go 1.22/Gin service for authentication, quotations, bills, clients, public shares, business profiles, and administrator user management. The [root README](../README.md) owns the complete API inventory, Google Sheets schemas, and deployment instructions; [AGENTS.md](../AGENTS.md) contains operational notes.

## Run

```bash
go mod download
go run ./cmd/server
```

The default address is `http://localhost:8000`.

Run these commands from `backend-go/`. Copy `.env.example` to `.env` and configure the spreadsheet and session secret before using authenticated endpoints. Existing environment variables take precedence over `.env`. `PORT` defaults to `8000`.

## Configuration

```env
GOOGLE_SHEET_ID=your-google-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
AUTH_SESSION_SECRET=use-a-long-random-value
COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:8000/api/v1/auth/google/callback
OAUTH_FRONTEND_URL=http://localhost:3000/
# Optional: comma-separated Workspace domains
GOOGLE_ALLOWED_DOMAINS=
```

Use `GOOGLE_SERVICE_ACCOUNT_JSON` instead of the file path in hosted environments. Share the spreadsheet with the service account as an Editor. User records are read from the schema registry at `backend-go/internal/sheets/schema.go`; per-tab names can be overridden via the `SHEET_TAB_USERS` environment variable. Range strings are derived from the column count.

Persistence uses `Users`, `Quotations`, `Bills`, `Clients`, `Employee`, `ShareLinks`, and `BusinessProfiles`; create their headers using the root README schemas. There is no template repository or template API in this checkout.

Business profiles read/write `BusinessProfiles!A:K`. Append `website` in K1 without moving A:J. Existing rows without K are supported. GET/PUT `/api/v1/business-profile` expose `website`; PUT preserves it when omitted and clears it when explicitly empty. Bare domains become HTTPS URLs, and other schemes are rejected. Backend support should be deployed before the frontend website field. These changes are unverified: tests and builds were skipped by request.

The OAuth settings are required for Google sign-in, not password sign-in. `GOOGLE_ALLOWED_DOMAINS` is optional. `AUTH_DEBUG` defaults to false. In production set `COOKIE_SECURE=true` and explicitly configure `CORS_ALLOWED_ORIGINS` with the frontend origin; PATCH is required for status updates.

In production, set `GOOGLE_OAUTH_REDIRECT_URL=https://quotify-i62o.onrender.com/api/v1/auth/google/callback` and `OAUTH_FRONTEND_URL=https://quotify-net.vercel.app/`. Register the Render callback URL in the Google Cloud OAuth client.

## API Reference

See the [complete endpoint table](../README.md#api), verified against `internal/routes/routes.go`.

- Client history: `GET /api/v1/clients/:id/documents` returns owner-scoped `quotation` and `bill` arrays, matched by client ID.
- Client archival: `PATCH /api/v1/clients/:id/status?status=archived`; use `status=active` to restore.
- Client deletion: `DELETE /api/v1/clients/:id` deletes only the owner's row; linked documents keep their stored client name.
- Employees: `GET/POST /api/v1/employees`, `GET/PUT/DELETE /api/v1/employees/:id`. Owner-scoped CRUD over `Employee!A2:K`; `status` accepts only `active` or `inactive` (new records default to `active`), there is no archival or documents endpoint, and employees are never tagged to quotations or bills.
- Quotation and bill status endpoints accept JSON with optional `status`, `paymentStatus`, and `payments` fields. Lifecycle and payment status are separate; accepted/declined decisions apply to quotations, and both document types accept a `payments` array of `{date, amount}` entries from which the payment status is re-derived (unpaid / partially_paid / paid). Quotation payments store `payment_status` in column Y and the JSON `payments` array in column Z; bill payments use `Bills!V:W` plus the `payments` array in column X. Opening a public quotation share auto-marks the quotation `viewed`.
- `POST /api/v1/quotations/:id/convert-to-bill` carries the quotation's recorded payments into the new bill with a derived payment status. Declined or cancelled quotations cannot be converted.
- Quotation and bill sharing both support POST to create and DELETE to revoke `/api/v1/{quotations|bills}/:id/share`. Public links use `GET /api/v1/public/share/:token`; bill and quotation share responses include `paymentStatus` and the raw `payments` array so the share page renders the same Received/Pending summary as the app. Share links expire 10 minutes after creation and return `410 Gone` once expired or revoked; `ShareLinks` timestamps are stored as Asia/Kolkata `DD-MM-YYYY HH:MM:SS`.
- Document updates preserve client links and bill due dates when omitted, and clear them on explicit empty strings. Nonempty due dates must be valid `YYYY-MM-DD` dates; submitted client IDs must belong to the owner.

Quotation, bill, and client access uses the owner from the signed session cookie. Preserve A:Q document columns and appended metadata positions (quotations use `Quotations!R:X` plus `payment_status` in Y and a JSON `payments` array in column Z; bills use `Bills!R:W` plus a JSON `payments` array in column X). Payment status is derived from recorded payments but can be overridden; no payment processor or overdue scheduler is implemented.

## Checks

Run `go test ./...` after backend changes. Metadata compatibility tests are in `internal/handlers/document_metadata_test.go`. Update this README and the root reference when backend contracts or setup change.
