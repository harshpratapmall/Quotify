import { getTodayDate } from '../config/quotation';
import { clientInitials } from './formatters';
import { getPrintableItems } from './quotation';

const pdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');

const loadLogoForPdf = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const width = 900;
        const height = Math.round((image.naturalHeight / image.naturalWidth) * width);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Unable to prepare the company logo.'));
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const encoded = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
        resolve({
          width,
          height,
          bytes: Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)),
        });
      } catch (error) {
        reject(new Error('Unable to prepare the company logo.'));
      }
    };
    image.onerror = () => reject(new Error('Unable to load the company logo.'));
    image.src = source;
  });

const loadPdfLogo = async (logoSource) => {
  try {
    return await loadLogoForPdf(logoSource || '/quotify-mark.svg');
  } catch (error) {
    if (!logoSource) throw error;
    return loadLogoForPdf('/quotify-mark.svg');
  }
};

export const downloadQuotationPdf = async ({
  quotation,
  items,
  includeGst,
  gstPercentage,
  subtotal,
  tax,
  total,
  activeQuotationId,
  logoSource,
  businessProfile = {},
  documentType = 'quotation',
  username = '',
}) => {
  const logo = await loadPdfLogo(logoSource);
  const isBill = documentType === 'bill';
  const documentTitle = isBill ? 'BILL' : 'QUOTATION';
  const accent = isBill ? [0.2, 0.32, 0.63] : [0.72, 0.58, 0.35];
  const header = isBill ? [0.09, 0.16, 0.35] : [0.11, 0.21, 0.26];
  const printableItems = getPrintableItems(items);
  const itemsPerPage = printableItems.length > 9 ? 14 : 9;
  const rowHeight = printableItems.length > 9 ? 24 : 31;
  const itemPages = [];

  for (let index = 0; index < printableItems.length; index += itemsPerPage) {
    itemPages.push(printableItems.slice(index, index + itemsPerPage));
  }

  let commands = [];
  const fill = (red, green, blue) => commands.push(`${red} ${green} ${blue} rg`);
  const rectangle = (x, y, width, height, color) => {
    fill(...color);
    commands.push(`${x} ${y} ${width} ${height} re f`);
  };
  const text = (value, x, y, size = 10, font = 'F1', color = [0.12, 0.2, 0.31]) => {
    fill(...color);
    commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET`);
  };
  const line = (x1, y1, x2, y2, color = [0.86, 0.89, 0.93]) => {
    commands.push(`${color.join(' ')} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const border = (x, y, width, height, color = [0.12, 0.2, 0.31], lineWidth = 0.8) => {
    commands.push(`${color.join(' ')} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`);
  };
  const pdfAmount = (amount) =>
    `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const shortText = (value, maxLength) => {
    const safeValue = String(value || 'Not provided');
    return safeValue.length > maxLength ? `${safeValue.slice(0, maxLength - 3)}...` : safeValue;
  };

  const today = getTodayDate();
  const quoteSuffix = activeQuotationId ? activeQuotationId.slice(-6).toUpperCase() : 'DRAFT';
  const quoteNumber = `${isBill ? 'BILL' : businessProfile.quotePrefix || 'QUOTE'}-${clientInitials(quotation.clientName)}-${(quotation.quoteDate || today).replaceAll('-', '')}-${quoteSuffix}`;

  // Generate filename in format: Quotation-Username-DDMonth / Bill-Username-DDMonth
  const dateObj = new Date(quotation.quoteDate || today);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ddMonth = `${String(dateObj.getDate()).padStart(2, '0')}${months[dateObj.getMonth()]}`;
  const displayName = username || businessProfile.businessName || 'User';
  const filename = `${isBill ? 'Bill' : 'Quotation'}-${displayName}-${ddMonth}.pdf`;

  rectangle(0, 0, 595, 842, [0.98, 0.97, 0.93]);
  rectangle(22, 22, 551, 798, [1, 1, 1]);
  border(22, 22, 551, 798, [0.14, 0.22, 0.24], 1.1);
  rectangle(22, 710, 551, 110, header);
  rectangle(22, 790, 551, 30, accent);
  rectangle(48, 738, 178, 48, [1, 1, 1]);
  commands.push('q 160 0 0 37 57 744 cm /Logo Do Q');
  rectangle(411, 778, 125, 21, [1, 1, 1]);
  text(documentTitle, 433, 785, 9, 'F2', header);
  text(quoteNumber, 352, 757, 9, 'F2', [1, 1, 1]);
  text(`Issued ${quotation.quoteDate || today}`, 413, 739, 8, 'F1', [0.78, 0.85, 0.9]);

  rectangle(48, 630, 499, 56, [0.97, 0.98, 0.96]);
  border(48, 630, 499, 56, [0.67, 0.75, 0.71]);
  rectangle(48, 630, 6, 56, [0.22, 0.43, 0.42]);
  text('TO', 66, 669, 8, 'F2', isBill ? [0.2, 0.32, 0.63] : [0.22, 0.43, 0.42]);
  text(shortText(quotation.clientName || 'Your Client', 26), 66, 652, 12, 'F2');
  text(shortText(quotation.phone || quotation.email || 'Mobile number to be added', 30), 66, 641, 8, 'F1', [0.37, 0.44, 0.53]);
  text('ADDRESS', 248, 669, 7, 'F2', isBill ? [0.2, 0.32, 0.63] : [0.22, 0.43, 0.42]);
  text(shortText(quotation.siteLocation || 'Site location to be added', 28), 248, 652, 9, 'F1', [0.19, 0.28, 0.31]);
  text(isBill ? 'JOB/WORK' : 'PROJECT', 408, 669, 7, 'F2', isBill ? [0.2, 0.32, 0.63] : [0.22, 0.43, 0.42]);
  text(shortText(quotation.projectName || (isBill ? 'Job/Work name to be added' : 'Interior Project'), 22), 408, 652, 9, 'F1', [0.19, 0.28, 0.31]);

  const tableTop = 591;
  rectangle(48, tableTop, 499, 27, header);
  text('DESCRIPTION', 61, tableTop + 10, 8, 'F2', [1, 1, 1]);
  text('QTY', 341, tableTop + 10, 8, 'F2', [1, 1, 1]);
  text('RATE', 396, tableTop + 10, 8, 'F2', [1, 1, 1]);
  text('AMOUNT', 471, tableTop + 10, 8, 'F2', [1, 1, 1]);

  const displayItems = itemPages[0];
  displayItems.forEach((item, index) => {
    const rowY = tableTop - 27 - index * rowHeight;
    if (index % 2 === 0) rectangle(48, rowY - 5, 499, rowHeight, [0.97, 0.98, 0.96]);
    text(shortText(item.description || 'Untitled item', 46), 60, rowY + 6, 9);
    text(String(item.quantity || 0), 347, rowY + 6, 9);
    text(pdfAmount(Number(item.rate) || 0), 390, rowY + 6, 9);
    text(pdfAmount((Number(item.quantity) || 0) * (Number(item.rate) || 0)), 463, rowY + 6, 9, 'F2');
    line(48, rowY - 5, 547, rowY - 5);
  });

  const tableBottom = tableTop - 27 - (displayItems.length - 1) * rowHeight - 5;
  border(48, tableBottom, 499, tableTop - tableBottom + 27, [0.46, 0.57, 0.57]);
  line(328, tableBottom, 328, tableTop + 27, [0.72, 0.78, 0.75]);
  line(378, tableBottom, 378, tableTop + 27, [0.72, 0.78, 0.75]);
  line(455, tableBottom, 455, tableTop + 27, [0.72, 0.78, 0.75]);

  if (itemPages.length === 1) {
    const totalsTop = tableBottom - 27;
    const totalX = 342;
    rectangle(330, totalsTop - 29, 217, 57, [0.96, 0.98, 0.96]);
    border(330, totalsTop - 29, 217, 57, [0.66, 0.75, 0.71]);
    text('Subtotal', totalX, totalsTop, 10, 'F1', [0.37, 0.44, 0.53]);
    text(pdfAmount(subtotal), 464, totalsTop, 10, 'F2');
    text(includeGst ? `GST (${gstPercentage}%)` : 'GST (not included)', totalX, totalsTop - 19, 10, 'F1', [0.37, 0.44, 0.53]);
    text(pdfAmount(tax), 464, totalsTop - 19, 10, 'F2');
    rectangle(totalX - 12, totalsTop - 62, 217, 36, isBill ? [0.2, 0.32, 0.63] : [0.22, 0.43, 0.42]);
    border(totalX - 12, totalsTop - 62, 217, 36, header, 1);
    text(isBill ? 'TOTAL DUE' : 'TOTAL ESTIMATE', totalX, totalsTop - 48, 10, 'F2', [1, 1, 1]);
    text(pdfAmount(total), 464, totalsTop - 48, 12, 'F2', [1, 1, 1]);
  } else {
    text('Continued on the next page', 396, 110, 8, 'F2', [0.22, 0.43, 0.42]);
  }

  line(48, 78, 547, 78, accent);
  text(shortText([businessProfile.phone, businessProfile.email].filter(Boolean).join('  |  ') || businessProfile.businessName || 'Quotify', 82), 58, 64, 7, 'F1', [0.37, 0.44, 0.53]);
  text(shortText(businessProfile.address || '', 82), 58, 52, 7, 'F1', [0.37, 0.44, 0.53]);
  text(`Page 1 of ${itemPages.length}`, 470, 40, 7, 'F1', [0.48, 0.55, 0.64]);

  const pageContents = [commands.join('\n')];

  itemPages.slice(1).forEach((pageItems, pageIndex) => {
    commands = [];
    rectangle(0, 0, 595, 842, [0.98, 0.97, 0.93]);
    rectangle(22, 22, 551, 798, [1, 1, 1]);
    border(22, 22, 551, 798, [0.14, 0.22, 0.24], 1.1);
    rectangle(22, 710, 551, 110, header);
    rectangle(22, 790, 551, 30, accent);
    rectangle(48, 738, 178, 48, [1, 1, 1]);
    commands.push('q 160 0 0 37 57 744 cm /Logo Do Q');
    text(`${documentTitle} - ITEMS CONTINUED`, 348, 770, 9, 'F2', [1, 1, 1]);
    text(quoteNumber, 414, 752, 8, 'F1', [0.78, 0.85, 0.9]);
    const continuationTop = 650;
    rectangle(48, continuationTop, 499, 27, header);
    text('DESCRIPTION', 61, continuationTop + 10, 8, 'F2', [1, 1, 1]);
    text('QTY', 341, continuationTop + 10, 8, 'F2', [1, 1, 1]);
    text('RATE', 396, continuationTop + 10, 8, 'F2', [1, 1, 1]);
    text('AMOUNT', 471, continuationTop + 10, 8, 'F2', [1, 1, 1]);

    pageItems.forEach((item, index) => {
      const rowY = continuationTop - 27 - index * rowHeight;
      if (index % 2 === 0) rectangle(48, rowY - 5, 499, rowHeight, [0.97, 0.98, 0.96]);
      text(shortText(item.description || 'Untitled item', 46), 60, rowY + 6, 9);
      text(String(item.quantity || 0), 347, rowY + 6, 9);
      text(pdfAmount(Number(item.rate) || 0), 390, rowY + 6, 9);
      text(pdfAmount((Number(item.quantity) || 0) * (Number(item.rate) || 0)), 463, rowY + 6, 9, 'F2');
      line(48, rowY - 5, 547, rowY - 5);
    });

    const continuationBottom = continuationTop - 27 - (pageItems.length - 1) * rowHeight - 5;
    border(48, continuationBottom, 499, continuationTop - continuationBottom + 27, [0.46, 0.57, 0.57]);
    line(328, continuationBottom, 328, continuationTop + 27, [0.72, 0.78, 0.75]);
    line(378, continuationBottom, 378, continuationTop + 27, [0.72, 0.78, 0.75]);
    line(455, continuationBottom, 455, continuationTop + 27, [0.72, 0.78, 0.75]);

    const finalPage = pageIndex === itemPages.length - 2;
    if (finalPage) {
      const totalsTop = continuationBottom - 27;
      const totalX = 342;
      rectangle(330, totalsTop - 29, 217, 57, [0.96, 0.98, 0.96]);
      border(330, totalsTop - 29, 217, 57, [0.66, 0.75, 0.71]);
      text('Subtotal', totalX, totalsTop, 10, 'F1', [0.37, 0.44, 0.53]);
      text(pdfAmount(subtotal), 464, totalsTop, 10, 'F2');
      text(includeGst ? `GST (${gstPercentage}%)` : 'GST (not included)', totalX, totalsTop - 19, 10, 'F1', [0.37, 0.44, 0.53]);
      text(pdfAmount(tax), 464, totalsTop - 19, 10, 'F2');
      rectangle(totalX - 12, totalsTop - 62, 217, 36, isBill ? [0.2, 0.32, 0.63] : [0.22, 0.43, 0.42]);
      border(totalX - 12, totalsTop - 62, 217, 36, header, 1);
      text(isBill ? 'TOTAL DUE' : 'TOTAL ESTIMATE', totalX, totalsTop - 48, 10, 'F2', [1, 1, 1]);
      text(pdfAmount(total), 464, totalsTop - 48, 12, 'F2', [1, 1, 1]);
    } else {
      text('Continued on the next page', 396, 110, 8, 'F2', [0.22, 0.43, 0.42]);
    }

    line(48, 78, 547, 78, accent);
    text(shortText([businessProfile.phone, businessProfile.email].filter(Boolean).join('  |  ') || businessProfile.businessName || 'Quotify', 82), 58, 64, 7, 'F1', [0.37, 0.44, 0.53]);
    text(shortText(businessProfile.address || '', 82), 58, 52, 7, 'F1', [0.37, 0.44, 0.53]);
    text(`Page ${pageIndex + 2} of ${itemPages.length}`, 470, 40, 7, 'F1', [0.48, 0.55, 0.64]);
    pageContents.push(commands.join('\n'));
  });

  const pageCount = pageContents.length;
  const pageObjectStart = 3;
  const contentObjectStart = pageObjectStart + pageCount;
  const fontObjectStart = contentObjectStart + pageCount;
  const logoObject = fontObjectStart + 2;
  const pageReferences = pageContents.map((_, index) => `${pageObjectStart + index} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageReferences}] /Count ${pageCount} >>`,
    ...pageContents.map((_, index) => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectStart} 0 R /F2 ${fontObjectStart + 1} 0 R >> /XObject << /Logo ${logoObject} 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`),
    ...pageContents.map((content) => `<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];

  const encoder = new TextEncoder();
  const chunks = [];
  let length = 0;
  const appendText = (value) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    length += bytes.length;
  };
  const appendBytes = (bytes) => {
    chunks.push(bytes);
    length += bytes.length;
  };

  appendText('%PDF-1.4\n');
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(length);
    appendText(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  offsets.push(length);
  appendText(`${logoObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`);
  appendBytes(logo.bytes);
  appendText('\nendstream\nendobj\n');
  const xrefOffset = length;
  appendText(`xref\n0 ${objects.length + 2}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    appendText(`${String(offset).padStart(10, '0')} 00000 n \n`);
  });
  appendText(`trailer\n<< /Size ${objects.length + 2} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blob = new Blob(chunks, { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 100);
};
