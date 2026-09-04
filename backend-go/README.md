# Quotify API

Go 1.22/Gin service for authentication and saved quotations. End-to-end setup, Google Sheets schema, deployment, and shared contracts are in the root `README.md`; agent routing notes are in `AGENTS.md`.

## Run

```bash
go mod tidy
go run ./cmd/server
```

The default address is `http://localhost:8000`.

## Required Configuration

```env
GOOGLE_SHEET_ID=your-google-spreadsheet-id
GOOGLE_SHEET_RANGE=Users!A:G
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
AUTH_SESSION_SECRET=use-a-long-random-value
COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Use `GOOGLE_SERVICE_ACCOUNT_JSON` instead of the file path when appropriate. Share the spreadsheet with the service account as an Editor. User records are read from `Users!A2:H`: bcrypt hashes are in column C and the legacy plaintext fallback is in column H. Quotation CRUD writes to `Quotations`; business profiles write to `BusinessProfiles`.

## Endpoints

- `GET /api/v1/ping`
- `GET /api/v1/auth/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET|PUT /api/v1/business-profile`
- `GET|POST /api/v1/quotations`
- `GET|PUT|DELETE /api/v1/quotations/:id`
- `GET|POST /api/v1/bills`
- `GET|PUT|DELETE /api/v1/bills/:id`
- `GET|POST /api/v1/admin/users` (administrator only)
- `PATCH /api/v1/admin/users/:id/status` (administrator only)
- `POST /api/v1/admin/users/:id/reset-password` (administrator only)

Quotation access is restricted to the owner encoded in the signed session cookie. Run `go test ./...` before backend changes.
