# Frontend

This folder contains the Quotify React frontend used to log in, create quotations, preview them, and export PDFs.

## Run

```bash
npm install
npm start
```

The app runs on `http://localhost:3000`.

## Environment

Create `.env` from `.env.example`:

```env
REACT_APP_ENV=local
```

If `REACT_APP_ENV` is omitted, the app falls back to hostname-based environment detection in `src/config/api.js`.

## Main Responsibilities

- Login screen and session check
- Client-side route transitions
- Quotation form state
- GST and total calculations
- Browser preview
- Print export
- Direct PDF generation in the browser

## Important Files

- `src/App.js`
- `src/config/api.js`
- `src/App.css`
- `src/App.test.js`

## Scripts

- `npm start`: start development server
- `npm test`: run frontend tests
- `npm run build`: create production build

See the repo-level `README.md` for end-to-end setup, backend integration, and deployment context.
