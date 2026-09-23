# Business Desk Frontend

React 19 frontend for quotations, bills, clients, employees, business profiles, sharing, and administrator user management. See the [root README](../README.md) for shared setup, API routes, schemas, and deployment.

## Run

```bash
npm install
npm start
```

Run these commands from `my-app/`. The app runs on `http://localhost:3000` and expects the local API on `http://localhost:8000`.

## Environment

Optional: create `.env` from `.env.example`:

```env
REACT_APP_ENV=local
```

`src/config/api.js` always selects the local API on `localhost` and `127.0.0.1`. Other hosts use `REACT_APP_ENV=development` or `production` when specified, then hostname detection, with production as the fallback. Hosted environments call the same-origin `/api` path, which Vercel rewrites to Render. This keeps authenticated cookies first-party on iPadOS. Setting `REACT_APP_ENV=local` does not force the local API on a remote hostname. API requests preserve `credentials: 'include'`.

## Main Responsibilities

- Password/Google sign-in and session checks
- Client-side route transitions
- User- and document-type-scoped session-storage drafts
- GST and total calculations
- Browser preview
- Direct PDF generation in the browser
- Business profile editing and Vercel Blob logo uploads
- Separate quotation and bill libraries with shared line-item pricing workflows
- Client search, add/edit/delete, contact autofill, and linked quotation/bill history
- Employee directory with search, add/edit/delete, and active/inactive archive (inactive rows hidden by default) plus WhatsApp and call shortcuts; employees are never linked to quotations or bills
- Document lifecycle controls for quotations and bills, quotation accepted/declined decisions (auto-marked `viewed` when a share link opens), and optional bill due dates. Quotations and bills track recorded payments by date and amount with a derived payment status; the payment-records panel with a Total/Received/Pending summary renders only for `partially_paid` documents, and payment details stay hidden for `cancelled` documents. Converting a quotation to a bill carries its recorded payments into the bill.
- Quotation-to-bill conversion, public links, and prefilled WhatsApp drafts
- Admin user search, creation, activation/deactivation, and password resets
- Per-library search (by username, client name, or project) and collapsible library tiles that reveal status and payment controls on click
- Color-coded library and client action buttons (preview/edit/delete), and themed status/payment dropdowns
- "Getting started" onboarding guide on the business profile page, toggled behind a button
- Business profile exposes contact and logo settings; quote prefix and terms are no longer edited in the UI
- Popup close buttons and click-away return to the page the popup opened from
- PDF downloads use lowercase filenames from the client name (e.g. `quotation-amit-06sep.pdf`) and print the business address across multiple lines in the footer

Share revocation is available through API service helpers but has no UI button. Client deletion removes the client row only; saved quotations and bills keep their stored client name but stop appearing in that client's linked history. Document templates and library search/filter controls are not implemented. Due dates display in the editor, library, and authenticated preview; PDF export does not currently include them. There is no separate print action.

## Important Files

- `src/App.js`
- `src/config/api.js`
- `src/App.css`
- `src/App.test.js`
- `src/services/apiClient.js`: shared `fetch` helper used by the document, client, auth, admin, and profile services
- `src/hooks/useSavedDocuments.js`: document-library state with upsert/replace/remove mutations
- `src/components/ClientSelector.js`, `Clients.js`: client reuse, edit/delete, and history
- `src/components/Employees.js`, `src/services/employees.js`: employee directory with search and edit/delete
- `src/components/DocumentStatus.js`, `src/config/statuses.js`: lifecycle/payment controls
- `src/utils/quotation.js`: save/reopen metadata and pricing helpers; also `src/utils/payments.js` for payment records and summaries
- `src/utils/pdf.js`: PDF export
- `src/utils/documentPdf.js`: shared on-demand jsPDF/AutoTable quotation/bill renderer; separate generation and download actions. `quotationPdf.js` retains a compatibility export.
- `src/components/ModalOverlay.js`, `SaveStatus.js`: shared popup backdrop and save-status primitives
- `api/blob-upload.js`: authenticated Vercel Blob upload authorization

## Quotation and Bill Downloads

Quotation PDFs use the green A4 design with a large business logo, quotation number/date, client/phone/address/project sections, numbered table, totals panel, house watermark, and contact footer. Text wraps, tables continue across pages, and totals stay together on the last page. Logos retain their aspect ratio; unavailable logos fall back to the business name. Missing footer fields are omitted. GST follows the document setting; calculations and filenames are unchanged.

Bill PDFs use the same template with a blue theme and `BILL / INVOICE` header. Partially paid, non-cancelled quotations and bills use a theme-colored Payment Summary card (green for quotations, blue for bills) with a Partially Paid badge, Subtotal, optional GST, Total Due, Amount Received, and Balance Due. Values use `getPaymentSummary`; the summary stays together on the final page. Other documents retain standard totals without payment-detail rows. Both PDF types center footer icons and wrapped contact text vertically across the footer columns.

The Business Profile page includes an optional Website field. The API normalizes bare domains to HTTPS and persists it in the new `BusinessProfiles` column K; the backend must support this before the frontend field is deployed. App previews and public share layouts keep their existing appearance. These changes are unverified: no tests, builds, sample PDFs, or rendered inspections were run, as requested.

## Logo Uploads

Business logos are uploaded to a public Vercel Blob store through `/api/blob/upload`. The app obtains a five-minute upload ticket from the authenticated backend and includes it in the Blob request; the Vercel function verifies it with the backend because the Render session cookie is not available on the Vercel domain. JPEG, PNG, and WebP files are limited to 500 KB, and uploaded logos are displayed inside a fixed topbar frame. The Vercel project must have `BLOB_READ_WRITE_TOKEN`, which is created automatically when the Blob store is connected. `QUOTIFY_API_URL` is optional and overrides the backend used to verify upload tickets.

The React development server alone does not run `api/blob-upload.js`; upload testing requires the Vercel function and Blob configuration. Open Edit Profile before selecting a logo, then save the profile to persist its URL.

## Deployment

Deploy this directory to Vercel with `npm run build` and output directory `build`. `vercel.json` rewrites `/share/:token` to the SPA and `/api/blob/upload` to the upload function. It also retains an `/api/*` proxy to Render, while normal browser API requests use the direct Render URL. Configure Render CORS to allow the deployed frontend origin.

## Scripts

- `npm start`: start development server
- `npm test`: run frontend tests
- `npm test -- --watchAll=false --runInBand`: run tests once without watch mode
- `npm run build`: create production build

Update this README and the root README when frontend workflows, setup, or supported features change. See [AGENTS.md](../AGENTS.md) for operational contracts and checks.
