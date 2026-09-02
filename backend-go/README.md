# backend-go

Starter Gin API service for the Quotify project.

## Run

```bash
go mod tidy
go run ./cmd/server
```

The server starts on `http://localhost:8000` by default.

## Login configuration

The login endpoint reads the first two columns of the `login` sheet as
`username` and `password`. Keep service-account credentials outside source
control and configure the server before running it:

```bash
GOOGLE_SHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
AUTH_SESSION_SECRET=use-a-long-random-value
```

See `.env.example` for the complete configuration. `GOOGLE_SHEET_ID` is the
long value between `/d/` and `/edit` in the Google Sheets URL; `login` is the
worksheet tab name, not the spreadsheet ID. Copy the template to `.env` for
local development; the server loads it automatically.

`GOOGLE_SERVICE_ACCOUNT_JSON` can be used instead of the file path for hosted
environments. Share the spreadsheet with the service account's `client_email`
as a Viewer. For production, use HTTPS and set `COOKIE_SECURE=true`.

Endpoints:

- `GET /api/v1/auth/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## Starter endpoint

`GET /api/v1/ping`

Example response:

```json
{
  "message": "pong",
  "status": "ok"
}
```
