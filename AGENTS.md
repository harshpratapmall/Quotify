# AGENTS.md

This file gives LLM agents a reliable mental model of the Quotify repository.

## Repo Summary

Quotify is a two-service web app:

- Frontend: React app in `my-app/`, deployed on Vercel
- Backend: Go + Gin API in `backend-go/`, deployed on Render

Primary business flow:

1. User opens the frontend.
2. Frontend checks `GET /api/v1/auth/me` with cookies included.
3. If unauthenticated, user logs in.
4. Backend validates credentials from Google Sheets.
5. Backend sets a signed session cookie.
6. Authenticated user creates and exports a quotation.

## What Exists Today

- Browser-based login form
- Cookie-based auth session
- Google Sheets-backed username/password validation
- Quotation form with client details, scope, line items, and GST
- Browser preview
- Client-side PDF generation
- Google Sheets-backed saved quotation CRUD
- Vercel Web Analytics through `@vercel/analytics`

## What Does Not Exist

- User management UI
- Password hashing layer in app code

Saved quotations are persisted to Google Sheets, not a database.

## Key Directories

### `my-app/`

- `src/App.js`: application state and orchestration for auth, quotation actions, and routing
- `src/components/`: login, dashboard, quotation workspace, preview, and shared presentational components
- `src/config/`: API, route, and quotation defaults
- `src/hooks/useAppRouter.js`: history-based client-side router
- `src/services/`: centralized authenticated API requests
- `src/utils/`: formatters, draft storage, quotation calculations/validation, and PDF generation
- `src/utils/analytics.js`: centralized Vercel Analytics route and user-action events
- `src/index.js`: React bootstrapping and Vercel Analytics initialization
- `vercel.json`: production `/api/*` rewrite to the Render backend
- `src/App.css`: styling for login, dashboard, modal, and quotation document
- `src/App.test.js`: basic login screen render test
- `.env.example`: frontend env reference

### `backend-go/`

- `cmd/server/main.go`: bootstraps env loading and starts Gin
- `internal/routes/routes.go`: route registration and CORS middleware
- `internal/handlers/auth.go`: login, health, me, logout, session cookie logic
- `internal/handlers/ping.go`: simple ping endpoint
- `internal/sheets/credentials.go`: Google service account auth and sheet lookup
- `internal/sheets/quotations.go`: quotation row serialization and Google Sheets CRUD
- `.env.example`: backend env reference

### Root

- `render.yaml`: Render deployment config for backend
- `README.md`: repo-level documentation
- `AGENTS.md`: this file

## Runtime Assumptions

- Frontend local dev runs on `http://localhost:3000`
- Backend local dev runs on `http://localhost:8000`
- Frontend sends cookies with `credentials: 'include'`
- Production frontend requests use the same-origin Vercel `/api/*` rewrite before reaching Render.
- Backend must allow the frontend origin in CORS
- Production frontend is on Vercel
- Production backend is on Render

## Environment Variables

### Frontend

- `REACT_APP_ENV`
  - Optional
  - Accepted values: `local`, `development`, `production`
  - If omitted, the app infers environment from `window.location.hostname`

### Backend

- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_RANGE`
- `GOOGLE_SERVICE_ACCOUNT_FILE`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `AUTH_SESSION_SECRET`
- `COOKIE_SECURE`
- `CORS_ALLOWED_ORIGINS`
- `AUTH_DEBUG`
- `PORT`

## Important Behavior Invariants

- Auth depends on the Google Sheet range containing username in column A and password in column B.
- `GOOGLE_SHEET_ID` is the spreadsheet ID, not the worksheet name.
- `GOOGLE_SHEET_RANGE` defaults to `login!A:B` if unset.
- `GOOGLE_SERVICE_ACCOUNT_JSON` takes precedence over `GOOGLE_SERVICE_ACCOUNT_FILE` only when provided; otherwise the file is read.
- The app uses a cookie named `quotify_session`.
- Session tokens are HMAC-signed and expire after 10 minutes.
- New quotation dates are derived in the `Asia/Kolkata` business timezone at workspace creation.
- The active quotation draft is stored in browser session storage.
- Saved quotations use the `Quotations` worksheet, with the full editable form stored in `items_json`.
- PDF generation is entirely client-side in `my-app/src/utils/pdf.js`.
- Analytics events must not include credentials, client details, quotation content, or other personal data.

## Common Agent Tasks

### If asked to change login behavior

- Inspect `backend-go/internal/handlers/auth.go`
- Inspect `backend-go/internal/sheets/credentials.go`
- Check whether CORS or cookie behavior also needs changes in `backend-go/internal/routes/routes.go`
- Verify the frontend API services still use `credentials: 'include'`

### If asked to change API environments

- Update `my-app/src/config/api.js`
- Preserve the production API base URL as an empty string so calls use the Vercel rewrite.
- Update `my-app/vercel.json` if the Render backend URL changes.
- Check `render.yaml`
- If new frontend domains are introduced, update backend CORS config

### If asked to change quotation layout or export behavior

- App orchestration is in `my-app/src/App.js`; UI is in `src/components/`
- Styling is in `my-app/src/App.css`
- PDF generation is in `my-app/src/utils/pdf.js`

### If asked to change saved quotations

- Inspect `backend-go/internal/handlers/quotations.go` and `backend-go/internal/sheets/quotations.go`.
- Preserve the `Quotations` sheet schema and `items_json` payload compatibility.

## Safe Edit Guidance

- Preserve `credentials: 'include'` on auth fetches unless intentionally redesigning auth.
- Preserve CORS alignment between non-production frontend origins and backend allowed origins.
- Preserve the Vercel API rewrite; external Render cookies can be blocked by browser third-party-cookie policies.
- Be careful with `COOKIE_SECURE`; local HTTP development needs it `false`, hosted HTTPS should use `true`.
- Avoid breaking the hostname-to-environment mapping in `my-app/src/config/api.js`.
- Keep secrets out of committed files. `.env` and `service-account.json` are intentionally ignored.

## Local Commands

Frontend:

```bash
cd my-app
npm start
npm test
npm run build
```

Backend:

```bash
cd backend-go
go run ./cmd/server
go test ./...
```

## Documentation Expectations

When updating documentation for this repo:

- Treat the root `README.md` as the source of truth for end-to-end setup
- Keep deployment notes aligned with Vercel for frontend and Render for backend
- Mention Google Sheets auth explicitly
- Mention that quotation generation is client-side

## Current Gaps Worth Flagging

- Plain-text credential validation from Google Sheets is operational but weak for long-term security
- Backend coverage currently tests cookie policy only; add route and Google Sheets boundary coverage as behavior grows.
- The Vercel rewrite requires `my-app/` to remain the Vercel project root directory.
