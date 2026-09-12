import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { getTodayDate } from '../config/quotation';
import { clientInitials } from './formatters';
import { getPrintableItems } from './quotation';
import { parsePayments, getPaymentSummary } from './payments';

const NAVY = '#0b2045';
const THEMES = {
  quotation: { primary: '#005747', accent: '#2c8062', pale: '#eff7f4', rule: '#c7dcd7', watermark: '#eaf4f0', icon: '#e0efea', stripe: '#f3f8f7' },
  bill: { primary: '#064a94', accent: '#2776bd', pale: '#eef7ff', rule: '#cce2f7', watermark: '#edf5fc', icon: '#d7eaff', stripe: '#f4f9fe' },
};
const MARGIN = 6;
const WIDTH = 198;
const amount = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Only the uploaded logo is rasterized. Text, tables, icons and decoration stay vector.
const loadLogo = (source) => new Promise((resolve) => {
  if (!source) { resolve(null); return; }
  const image = new Image();
  const timer = window.setTimeout(() => resolve(null), 8000);
  const finish = (value) => { window.clearTimeout(timer); resolve(value); };
  image.crossOrigin = 'anonymous';
  image.onerror = () => finish(null);
  image.onload = () => {
    try {
      if (!image.naturalWidth || !image.naturalHeight) { finish(null); return; }
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) { finish(null); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      finish({ data: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height });
    } catch { finish(null); }
  };
  image.src = source;
});

function icon(pdf, type, x, y, size = 6, color = THEMES.quotation.primary) {
  pdf.setDrawColor(color);
  pdf.setFillColor(color);
  pdf.setLineWidth(0.5);
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (type === 'payment') {
    pdf.roundedRect(x, y, size, size, 0.7, 0.7, 'F');
    pdf.setDrawColor('#ffffff');
    pdf.line(x + 0.7, y + size * 0.3, x + size - 0.7, y + size * 0.3);
    pdf.line(x + 0.7, y + size * 0.6, x + size * 0.55, y + size * 0.6);
  } else if (type === 'clock') {
    pdf.circle(cx, cy, size * 0.45, 'F');
    pdf.setDrawColor('#ffffff');
    pdf.line(cx, y + size * 0.2, cx, cy);
    pdf.line(cx, cy, x + size * 0.7, y + size * 0.65);
  } else if (type === 'person') {
    pdf.circle(cx, y + size * 0.25, size * 0.19, 'F');
    pdf.roundedRect(x + size * 0.12, cy, size * 0.76, size * 0.48, 1, 1, 'F');
  } else if (type === 'location') {
    pdf.circle(cx, y + size * 0.36, size * 0.32, 'F');
    pdf.triangle(x + size * 0.23, y + size * 0.5, x + size * 0.77, y + size * 0.5, cx, y + size, 'F');
    pdf.setFillColor('#ffffff');
    pdf.circle(cx, y + size * 0.34, size * 0.12, 'F');
  } else if (type === 'project') {
    pdf.roundedRect(x, y + size * 0.25, size, size * 0.7, 0.5, 0.5, 'F');
    pdf.roundedRect(x + size * 0.3, y, size * 0.4, size * 0.35, 0.5, 0.5, 'S');
    pdf.setDrawColor('#ffffff');
    pdf.line(x, cy, x + size, cy);
  } else if (type === 'email') {
    pdf.rect(x, y + size * 0.15, size, size * 0.7, 'S');
    pdf.line(x, y + size * 0.15, cx, cy);
    pdf.line(cx, cy, x + size, y + size * 0.15);
  } else if (type === 'website') {
    pdf.circle(cx, cy, size * 0.45, 'S');
    pdf.ellipse(cx, cy, size * 0.2, size * 0.45, 'S');
    pdf.line(x, cy, x + size, cy);
    pdf.line(x + size * 0.13, y + size * 0.28, x + size * 0.87, y + size * 0.28);
    pdf.line(x + size * 0.13, y + size * 0.72, x + size * 0.87, y + size * 0.72);
  } else {
    pdf.setLineWidth(size * 0.19);
    pdf.line(x + size * 0.2, y + size * 0.15, x + size * 0.3, y + size * 0.6);
    pdf.line(x + size * 0.3, y + size * 0.6, x + size * 0.8, y + size * 0.85);
    pdf.setLineWidth(size * 0.28);
    pdf.line(x + size * 0.15, y + size * 0.1, x + size * 0.35, y + size * 0.2);
    pdf.line(x + size * 0.75, y + size * 0.65, x + size * 0.85, y + size * 0.85);
  }
}

export async function generateDocumentPdf({ quotation, items, includeGst, gstPercentage,
  subtotal, tax, total, activeQuotationId, logoSource, businessProfile = {}, documentType = 'quotation' }) {
  const isBill = documentType === 'bill';
  const theme = THEMES[isBill ? 'bill' : 'quotation'];
  const PRIMARY = theme.primary;
  const PALE = theme.pale;
  const RULE = theme.rule;
  const title = isBill ? 'BILL / INVOICE' : 'QUOTATION';
  const paymentSummary = isBill && quotation.status !== 'cancelled' && quotation.paymentStatus === 'partially_paid'
    ? getPaymentSummary(parsePayments(quotation.payments), total) : null;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const logo = await loadLogo(logoSource || businessProfile.logoUrl);
  const date = quotation.quoteDate || getTodayDate();
  const suffix = activeQuotationId ? activeQuotationId.slice(-6).toUpperCase() : 'DRAFT';
  const reference = `${isBill ? 'BILL' : businessProfile.quotePrefix || 'QUOTE'}-${clientInitials(quotation.clientName)}-${date.replaceAll('-', '')}-${suffix}`;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const client = String(quotation.clientName || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client';
  const filename = `${isBill ? 'bill' : 'quotation'}-${client}-${date.slice(8, 10)}${months[Number(date.slice(5, 7)) - 1]}.pdf`;
  pdf.setProperties({ title: `${title} ${reference}` });
  const text = (value, x, y, size = 10, bold = false, color = NAVY, options = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    pdf.text(value, x, y, options);
  };
  const wrap = (value, width, size = 10, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    return pdf.splitTextToSize(String(value || ''), width);
  };
  const footerFields = [
    ['phone', businessProfile.phone, 0.17], ['email', businessProfile.email, 0.29],
    ['location', businessProfile.address, 0.30], ['website', businessProfile.website, 0.24],
  ].filter(([, value]) => String(value || '').trim());
  const weight = footerFields.reduce((sum, entry) => sum + entry[2], 0);
  const footer = footerFields.map(([type, value, part]) => {
    const width = WIDTH * part / weight;
    const lines = wrap(value, width - 14, 7.2);
    // Use the same explicit line height for measurement and drawing.
    return { type, width, lines, textHeight: lines.length * 3.2 };
  });
  const footerHeight = Math.max(20, ...footer.map((entry) => Math.max(6, entry.textHeight) + 10));
  const footerTop = 289 - footerHeight;
  if (footerHeight > 90) throw new Error('Business contact details are too long for the PDF footer. Please shorten them in Business Profile.');
  const pageBottom = footerTop - 7;
  const decoration = () => {
    pdf.setFillColor(theme.accent);
    pdf.rect(MARGIN, 6, WIDTH, 4, 'F');
    pdf.setFillColor(PRIMARY);
    pdf.lines([[30, 0], [0, 4], [-34, 0], [4, -4]], 174, 6, [1, 1], 'F', true);
    pdf.setFillColor(theme.watermark);
    // Two abstract house outlines echo the supplied template without branding them.
    pdf.lines([[22, -18], [21, 18], [0, 39], [-6, 0], [0, -36], [-15, -13], [-16, 13], [-6, 0]], 22, footerTop - 38, [1, 1], 'F', true);
    pdf.lines([[14, -12], [36, 31], [0, 7], [-36, -30], [-14, 12]], 0, footerTop - 32, [1, 1], 'F', true);
    [[39, footerTop - 33], [45, footerTop - 33], [8, footerTop - 17], [14, footerTop - 17]].forEach(([x, y]) => pdf.rect(x, y, 4.5, 4.5, 'F'));
  };
  const compactHeader = () => {
    text(title, MARGIN, 21, 18, true, PRIMARY);
    const lines = wrap(`#${reference}`, 114, 8);
    text(lines, 204, 19, 8, false, NAVY, { align: 'right' });
    return Math.max(29, 19 + lines.length * 3.5 + 6);
  };

  decoration();
  const brand = wrap(businessProfile.businessName || 'Your Business', 99, 20, true);
  const refLines = wrap(`#${reference}`, 48, 9);
  const headerHeight = Math.max(29, logo ? 29 : brand.length * 8.1, 22 + refLines.length * 3.7);
  if (headerHeight > 90) throw new Error('Business name or quotation prefix is too long for the quotation header.');
  if (logo) {
    const w = Math.min(99, 29 * logo.ratio);
    const h = w / logo.ratio;
    pdf.addImage(logo.data, 'PNG', 8 + (99 - w) / 2, 20 + (headerHeight - h) / 2, w, h);
  } else text(brand, 8, 27, 20, true);
  pdf.setDrawColor(PRIMARY);
  pdf.setLineWidth(0.25);
  pdf.line(116.5, 20, 116.5, 20 + headerHeight);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(28);
  const titleSize = Math.min(28, 28 * 77 / pdf.getTextWidth(title));
  text(title, 127, 31, titleSize, true, PRIMARY);
  text(isBill ? 'Bill No.' : 'Quote No.', 127, 39, 10, false, PRIMARY);
  text(refLines, 155, 39, 9);
  const dateY = 39 + refLines.length * 3.7 + 3;
  text('Date of Issue', 127, dateY, 10, false, PRIMARY);
  text(date, 163, dateY, 10);

  const clientTop = 20 + headerHeight + 5;
  // Address is placed last and gets the widest column so long addresses do not
  // squeeze the client, phone, or project details.
  const clientFields = [
    ['person', 'Client', quotation.clientName, 47], ['phone', 'Phone', quotation.phone, 44],
    ['project', 'Project', quotation.projectName, 42], ['location', 'Address', quotation.siteLocation, 65],
  ].map(([type, label, value, width]) => ({ type, label, width, lines: wrap(value || '-', width - 21, 10, label === 'Client') }));
  const clientHeight = Math.max(22, ...clientFields.map((entry) => 12 + entry.lines.length * 4.1));
  if (clientTop + clientHeight > pageBottom - 40) throw new Error('Client details are too long for the quotation header. Please shorten them.');
  pdf.setFillColor(PALE);
  pdf.roundedRect(MARGIN, clientTop, WIDTH, clientHeight, 2, 2, 'F');
  let clientX = MARGIN;
  clientFields.forEach((entry, index) => {
    if (index) { pdf.setDrawColor(RULE); pdf.setLineWidth(0.25); pdf.line(clientX, clientTop + 4, clientX, clientTop + clientHeight - 4); }
    pdf.setFillColor(theme.icon);
    pdf.roundedRect(clientX + 4, clientTop + 5, 11, 11, 2, 2, 'F');
    icon(pdf, entry.type, clientX + 6.5, clientTop + 7.5, 6, PRIMARY);
    text(entry.label, clientX + 19, clientTop + 9, 8, true);
    text(entry.lines, clientX + 19, clientTop + 14.5, 10, entry.label === 'Client');
    clientX += entry.width;
  });
  const tableTop = clientTop + clientHeight + 5;
  // Continuation space is independent of the taller first-page client block.
  const continuationTop = Math.max(29, 19 + wrap(`#${reference}`, 114, 8).length * 3.5 + 6);
  autoTable(pdf, {
    startY: tableTop,
    margin: { left: MARGIN, right: MARGIN, top: continuationTop, bottom: 297 - pageBottom },
    head: [['#', 'DESCRIPTION', 'QTY', 'UNIT RATE', 'AMOUNT']],
    body: getPrintableItems(items).map((item, index) => [String(index + 1), item.description || 'Untitled item', String(item.quantity || 0), amount(item.rate), amount((Number(item.quantity) || 0) * (Number(item.rate) || 0))]),
    theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 10, textColor: NAVY, lineColor: RULE, lineWidth: 0.2, cellPadding: 4, minCellHeight: 16, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY, textColor: '#ffffff', fontStyle: 'bold', minCellHeight: 14 },
    alternateRowStyles: { fillColor: theme.stripe },
    columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 76 }, 2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 39, halign: 'right' }, 4: { cellWidth: 43, halign: 'right', fontStyle: 'bold' } },
    willDrawPage: ({ pageNumber }) => { if (pageNumber > 1) { decoration(); compactHeader(); } },
  });
  const panelHeight = paymentSummary ? (includeGst ? 61 : 53) : (includeGst ? 43 : 32);
  let totalTop = pdf.lastAutoTable.finalY + 5;
  if (totalTop + panelHeight > pageBottom) {
    pdf.addPage(); decoration(); totalTop = compactHeader() + 7;
  }
  const totalX = 100;
  pdf.setFillColor(PALE);
  pdf.roundedRect(totalX, totalTop, 104, panelHeight, 1.5, 1.5, 'F');
  const fittedAmount = (value, y, size, color = NAVY, maxWidth = 52) => {
    const label = amount(value);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(size);
    const fitted = Math.min(size, size * maxWidth / Math.max(maxWidth, pdf.getTextWidth(label)));
    text(label, 198, y, fitted, true, color, { align: 'right' });
  };
  if (paymentSummary) {
    icon(pdf, 'payment', 104, totalTop + 3, 7, PRIMARY);
    text('Payment Summary', 114, totalTop + 8, 10, true, PRIMARY);
    pdf.setFillColor(theme.icon);
    pdf.roundedRect(166, totalTop + 2, 35, 9, 4, 4, 'F');
    icon(pdf, 'clock', 169, totalTop + 4, 4.5, PRIMARY);
    text('Partially Paid', 175, totalTop + 7.8, 8, true, PRIMARY);
    let rowY = totalTop + 14;
    const summaryRow = (label, value, height, background, size = 10, bold = false, color = PRIMARY) => {
      pdf.setFillColor(background);
      pdf.rect(totalX, rowY, 104, height, 'F');
      const baseline = rowY + height / 2 + size * 0.3528 * 0.32;
      text(label, 105, baseline, size, bold, color);
      fittedAmount(value, baseline, size, color, 47);
      rowY += height;
    };
    summaryRow('Subtotal', subtotal, 8, '#ffffff', 9);
    if (includeGst) {
      pdf.setDrawColor(RULE); pdf.setLineWidth(0.2); pdf.line(104, rowY, 200, rowY);
      summaryRow(`GST (${gstPercentage}%)`, tax, 8, '#ffffff', 9);
    }
    summaryRow('Total Due', total, 12, PRIMARY, 13, true, '#ffffff');
    summaryRow('Amount Received', paymentSummary.received, 9, '#f4f9fe', 10);
    summaryRow('Balance Due', paymentSummary.pending, 10, theme.icon, 12, true);
    pdf.setDrawColor(RULE); pdf.setLineWidth(0.25);
    pdf.roundedRect(totalX, totalTop, 104, panelHeight, 1.5, 1.5, 'S');
  } else {
    text('Subtotal', 106, totalTop + 10, 11);
    fittedAmount(subtotal, totalTop + 10, 11);
    if (includeGst) {
      pdf.setDrawColor(RULE); pdf.setLineWidth(0.25); pdf.line(106, totalTop + 14, 198, totalTop + 14);
      text(`GST (${gstPercentage}%)`, 106, totalTop + 21, 11);
      fittedAmount(tax, totalTop + 21, 11);
    }
    pdf.setFillColor(PRIMARY);
    pdf.rect(totalX, totalTop + panelHeight - 17, 104, 17, 'F');
    text(isBill ? 'TOTAL DUE' : 'TOTAL ESTIMATE', 106, totalTop + panelHeight - 6, 12, true, '#ffffff');
    fittedAmount(total, totalTop + panelHeight - 6, 20, '#ffffff', 47);
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(PRIMARY); pdf.setLineWidth(0.3);
    pdf.line(MARGIN, footerTop, 204, footerTop);
    pdf.line(MARGIN, 289, 204, 289);
    let x = MARGIN;
    const footerCenterY = footerTop + footerHeight / 2;
    footer.forEach((entry, index) => {
      if (index) { pdf.setDrawColor(RULE); pdf.setLineWidth(0.25); pdf.line(x, footerTop + 4, x, 285); }
      // Every icon and text block shares a horizontal center line, including
      // multiline addresses. PDF text uses a baseline rather than a top edge.
      icon(pdf, entry.type, x + 2, footerCenterY - 3, 6, PRIMARY);
      const textTop = footerCenterY - entry.textHeight / 2;
      entry.lines.forEach((line, index) => text(line, x + 11, textTop + index * 3.2 + 2.45, 7.2));
      x += entry.width;
    });
    pdf.setFillColor(theme.accent);
    pdf.lines([[28, 0], [0, 4], [-32, 0], [4, -4]], 176, 287, [1, 1], 'F', true);
    if (pageCount > 1) text(`Page ${page} of ${pageCount}`, 105, 294, 7, false, PRIMARY, { align: 'center' });
  }
  return { pdf, filename };
}
