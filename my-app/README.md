# Frontend

This folder contains the Quotify React frontend used to log in, create quotations and bills, preview them, and export PDFs.

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
- Business profile editing and Vercel Blob logo uploads
- Separate quotation and bill libraries with shared line-item pricing workflows

## Important Files

- `src/App.js`
- `src/config/api.js`
- `src/App.css`
- `src/App.test.js`
- `api/blob-upload.js`: authenticated Vercel Blob upload authorization

## Logo Uploads

Business logos are uploaded to a public Vercel Blob store through `/api/blob/upload`. JPEG, PNG, and WebP files are limited to 200 KB, and uploaded logos are displayed inside a fixed topbar frame. The Vercel project must have `BLOB_READ_WRITE_TOKEN`, which is created automatically when the Blob store is connected. `QUOTIFY_API_URL` is optional and overrides the backend used to confirm the signed session before an upload is authorized.

## Scripts

- `npm start`: start development server
- `npm test`: run frontend tests
- `npm run build`: create production build

See the repo-level `README.md` for end-to-end setup, backend integration, and deployment context.
