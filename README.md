# Quotify

Quotify is a lightweight quotation workspace for Door2Door Interiors. The app lets team members sign in with credentials stored in Google Sheets, prepare itemized interior quotations, preview them in the browser, and export them as printable PDFs.

The repository contains:

- `my-app/`: React frontend, hosted on Vercel
- `backend-go/`: Go API using Gin, hosted on Render
- `render.yaml`: Render service definition for the backend

## Product Flow

```mermaid
flowchart TD
    A[User opens Vercel frontend] --> B[React app loads]
    B --> C[Check session via GET /api/v1/auth/me]
    C -->|Valid cookie| D[Show quotation workspace]
    C -->|No session| E[Show login screen]
    E --> F[POST /api/v1/auth/login]
    F --> G[Render-hosted Go API]
    G --> H[Load Google service account credentials]
    H --> I[Read active user and bcrypt hash from Users sheet]
    I -->|Match found| J[Create signed session cookie]
    I -->|No match| K[Return 401]
    J --> L[Browser stores cookie]
    L --> D
    D --> M[User enters client details, scope, items, GST]
    M --> N[React calculates subtotal, tax, and total]
    N --> O[Preview quotation in browser]
    O --> P[Generate PDF in the client]
```

## Architecture

### Frontend

- Built with React 19 and Create React App tooling.
- Uses a simple client-side router based on `window.history`.
- Calls the backend with `credentials: 'include'` so the session cookie is sent on each auth request.
- In production, sends `/api/*` calls to a Vercel rewrite that forwards them to Render and keeps the session cookie first-party.
- Generates the quotation preview and downloadable PDF entirely in the browser.
- Chooses the API base URL from the browser hostname or `REACT_APP_ENV`.
- Uses `@vercel/analytics` for Vercel Web Analytics; it is initialized from `src/index.js`.
- Tracks route views and button actions with privacy-safe custom events; no credentials, client details, or quotation content is included.

Key files:

- [my-app/src/App.js](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/App.js)
- [my-app/src/config/api.js](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/config/api.js)
- [my-app/src/config/quotation.js](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/config/quotation.js)
- [my-app/src/components/](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/components/)
- [my-app/src/services/](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/services/)
- [my-app/src/utils/](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/utils/)
- [my-app/src/App.css](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/App.css)

### Backend

- Built with Go 1.22 and Gin.
- Exposes auth endpoints and a ping endpoint.
- Verifies active users against the `Users` worksheet using bcrypt password hashes.
- Issues an HMAC-signed session cookie after successful login.
- Allows cross-origin requests from approved frontend domains.

Key files:

- [backend-go/cmd/server/main.go](/C:/Users/Imart/Desktop/POC/Quotify/backend-go/cmd/server/main.go)
- [backend-go/internal/routes/routes.go](/C:/Users/Imart/Desktop/POC/Quotify/backend-go/internal/routes/routes.go)
- [backend-go/internal/handlers/auth.go](/C:/Users/Imart/Desktop/POC/Quotify/backend-go/internal/handlers/auth.go)
- [backend-go/internal/sheets/credentials.go](/C:/Users/Imart/Desktop/POC/Quotify/backend-go/internal/sheets/credentials.go)

## Repository Layout

```text
.
|-- backend-go/
|   |-- cmd/server/main.go
|   |-- internal/handlers/
|   |-- internal/routes/
|   |-- internal/sheets/
|   |-- .env.example
|   `-- README.md
|-- my-app/
|   |-- public/
|   |-- src/
|   |-- .env.example
|   `-- README.md
|-- render.yaml
|-- AGENTS.md
`-- README.md
```

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/ping` | Basic uptime check |
| `GET` | `/api/v1/auth/health` | Verifies auth configuration is usable |
| `POST` | `/api/v1/auth/login` | Validates credentials and creates a session |
| `GET` | `/api/v1/auth/me` | Returns current authenticated user if cookie is valid |
| `POST` | `/api/v1/auth/logout` | Clears the session cookie |
| `GET` | `/api/v1/quotations` | Lists the signed-in user's saved quotations |
| `POST` | `/api/v1/quotations` | Creates a saved quotation |
| `GET` | `/api/v1/quotations/:id` | Reads one saved quotation |
| `PUT` | `/api/v1/quotations/:id` | Updates one saved quotation |
| `DELETE` | `/api/v1/quotations/:id` | Deletes one saved quotation |

## Local Development

### Prerequisites

- Node.js and npm
- Go 1.22+
- A Google Cloud service account with Sheets read access
- A Google Sheet containing the configured `Users` worksheet and user columns

### 1. Backend setup

From [backend-go/.env.example](/C:/Users/Imart/Desktop/POC/Quotify/backend-go/.env.example), create `backend-go/.env` and fill in:

```env
GOOGLE_SHEET_ID=your-google-spreadsheet-id
GOOGLE_SHEET_RANGE=Users!A:G
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTH_DEBUG=false
```

Then place the service account JSON at `backend-go/service-account.json`, or use `GOOGLE_SERVICE_ACCOUNT_JSON` instead.

Run the backend:

```bash
cd backend-go
go run ./cmd/server
```

The API starts on `http://localhost:8000` unless `PORT` is set.

### 2. Frontend setup

From [my-app/.env.example](/C:/Users/Imart/Desktop/POC/Quotify/my-app/.env.example), create `my-app/.env`:

```env
REACT_APP_ENV=local
```

Run the frontend:

```bash
cd my-app
npm install
npm start
```

The app runs on `http://localhost:3000`.

### 3. Google Sheets format

The backend expects the configured range to contain:

| Column | Field |
| --- | --- |
| A | user_id |
| B | username |
| C | password_hash (bcrypt) |
| D | display_name |
| E | role |
| F | status (`active` enables login) |
| G | created_at |
| H | password (administrative reference only) |

Notes:

- The sheet/tab name is part of `GOOGLE_SHEET_RANGE`, not `GOOGLE_SHEET_ID`.
- The service account `client_email` must be shared on the spreadsheet with at least Viewer access.
- The service account should have Viewer access for authentication and Editor access for quotation persistence.
- The `password` column is not read by the application and should be treated as sensitive administrative data.

## Deployment

### Frontend on Vercel

The frontend is intended to be deployed from `my-app/`.

`my-app/vercel.json` proxies production `/api/*` requests to the Render service. Keep this rewrite in place: it allows modern browsers to retain the HTTP-only session cookie without relying on third-party-cookie support.

Current production hostname mapping in the code:

- `quotify-net.vercel.app` -> production backend
- `dev-quotify.intermesh.net` -> development backend
- `quotify.intermesh.net` -> production backend

The frontend API resolver lives in [my-app/src/config/api.js](/C:/Users/Imart/Desktop/POC/Quotify/my-app/src/config/api.js).

### Backend on Render

[render.yaml](/C:/Users/Imart/Desktop/POC/Quotify/render.yaml) defines a single Go web service:

- Service name: `quotify-i62o`
- Root directory: `backend-go`
- Build command: `go build -tags netgo -ldflags '-s -w' -o app ./cmd/server`
- Start command: `./app`
- Health check: `/api/v1/auth/health`

Important Render environment variables:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_RANGE`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `AUTH_SESSION_SECRET`
- `COOKIE_SECURE=true`
- `CORS_ALLOWED_ORIGINS=https://quotify-net.vercel.app`
- `AUTH_DEBUG=false`

## Authentication Notes

- Sessions are stored in an HTTP-only cookie named `quotify_session`.
- Session tokens are signed with `AUTH_SESSION_SECRET`.
- Cookie lifetime is 1 hour.
- `COOKIE_SECURE` should be `true` in HTTPS environments such as Render behind a public domain.
- Production API requests use a Vercel rewrite so the cookie is first-party. Local and development environments still require CORS and browser credentials mode to stay aligned.

## Saved Quotations

Saved quotations use the `Quotations` worksheet in the existing Quotely spreadsheet. Row 1 must retain these columns in order: `quotation_id`, `created_at`, `updated_at`, `owner_user_id`, `client_name`, `project_name`, `phone`, `email`, `site_location`, `quote_date`, `scope_of_work`, `include_gst`, `gst_rate`, `items_json`, `subtotal`, `tax`, `total`.

The backend stores one quotation per row. `items_json` contains the complete editable quotation payload; the remaining columns make the sheet easy to review and filter. The Google service account configured by `GOOGLE_SERVICE_ACCOUNT_JSON` must be shared as an **Editor** on Quotely, and the Google Sheets API must be enabled for that service account's Google Cloud project.

## Quotation Behavior

- The active quotation draft lives in browser session storage.
- Saved quotations are persisted in the Google Sheets `Quotations` worksheet and filtered by `owner_user_id`.
- New quotation dates use the `Asia/Kolkata` business calendar.
- Totals are calculated in the browser from line items and GST settings.
- Preview rendering and direct PDF generation happen client-side.

## Testing

Frontend:

```bash
cd my-app
npm test
```

Backend:

```bash
cd backend-go
go test ./...
```

## Known Constraints

- Authentication depends on Google Sheets availability.
- Google Sheets remains a lightweight datastore; use a database when concurrency or volume grows.
- There is no database or server-side quotation history.
- The app currently focuses on authentication and quotation generation only.

## Suggested Next Improvements

- Move sheet-based credentials to a stronger auth system when ready.
- Persist quotations for reuse, search, and audit history.
- Add Google Sheets integration-boundary tests alongside the existing cookie-policy tests.
- Add Vercel project configuration docs if the deployment is managed outside this repository.
