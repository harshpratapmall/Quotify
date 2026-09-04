import { track } from '@vercel/analytics';

export const ANALYTICS_EVENTS = {
  loginSubmitted: 'Login Submitted',
  loginSucceeded: 'Login Succeeded',
  loginFailed: 'Login Failed',
  logoutRequested: 'Logout Requested',
  routeViewed: 'Route Viewed',
  quotationStarted: 'Quotation Started',
  quotationOpened: 'Quotation Opened',
  quotationDeleteRequested: 'Quotation Delete Requested',
  quotationDeleted: 'Quotation Deleted',
  quotationSaveSucceeded: 'Quotation Save Succeeded',
  quotationSaveFailed: 'Quotation Save Failed',
  quotationPreviewed: 'Quotation Previewed',
  quotationPreviewFailed: 'Quotation Preview Failed',
  quotationPdfDownloaded: 'Quotation PDF Downloaded',
  quotationPdfDownloadFailed: 'Quotation PDF Download Failed',
  workspaceClosed: 'Quotation Workspace Closed',
  workspaceReset: 'Quotation Workspace Reset',
  lineItemAdded: 'Quotation Line Item Added',
  lineItemRemoved: 'Quotation Line Item Removed',
  gstToggled: 'Quotation GST Toggled',
  previewClosed: 'Quotation Preview Closed',
};

export const trackAction = (eventName, data) => {
  track(eventName, data);
};

export const trackRoute = (route) => {
  trackAction(ANALYTICS_EVENTS.routeViewed, { route });
};
