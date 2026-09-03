import { useEffect, useState } from 'react';
import { apiUrl } from './config/api';
import companyLogo from './assets/d2d-experts-logo.webp';
import './App.css';

const lineItemTemplate = { description: '', quantity: '1', rate: '' };

const today = new Date().toISOString().slice(0, 10);

const createEmptyQuotation = () => ({
  clientName: '',
  projectName: '',
  phone: '',
  email: '',
  siteLocation: '',
  quoteDate: today,
  scopeOfWork: '',
});

const currency = (amount) =>
  `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const pdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');

const wrapText = (value, maxLength = 82) => {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  return lines.length || line ? [...lines, line] : ['Not provided'];
};

const loadLogoForPdf = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
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
    };
    image.onerror = () => reject(new Error('Unable to load the company logo.'));
    image.src = source;
  });

function LoginScreen({ onLogin, isLoggingIn, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submitLogin = (event) => {
    event.preventDefault();
    onLogin({ username, password });
  };

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-brand">
          <img className="company-logo login-logo" src={companyLogo} alt="Door2Door Experts" />
        </div>
        <div className="login-copy">
          <p className="eyebrow">Welcome back</p>
          <h2>Every beautiful space starts with a confident proposal.</h2>
          <p>Sign in to build tailored estimates, review project pricing, and create client-ready quotations.</p>
        </div>
        <div className="login-swatches" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submitLogin}>
          <p className="eyebrow">Secure access</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-help">Use the account shared with you by Door2Door Interiors.</p>
          <label>
            Username
            <input type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" required />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="primary-action login-action" disabled={isLoggingIn}>{isLoggingIn ? 'Signing in...' : 'Sign In'}</button>
        </form>
      </section>
    </main>
  );
}

function useAppRouter() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePathname);
    return () => window.removeEventListener('popstate', updatePathname);
  }, []);

  const navigate = (path, replace = false) => {
    if (window.location.pathname === path) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    setPathname(path);
  };

  return { pathname, navigate };
}

function App() {
  const { pathname, navigate } = useAppRouter();
  const [authStatus, setAuthStatus] = useState('checking');
  const [authExpiresAt, setAuthExpiresAt] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [items, setItems] = useState([{ ...lineItemTemplate }]);
  const [includeGst, setIncludeGst] = useState(true);
  const [gstRate, setGstRate] = useState('18');
  const [quotation, setQuotation] = useState(createEmptyQuotation);

  const handleQuotationChange = (field, value) => {
    setQuotation((currentQuotation) => ({
      ...currentQuotation,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addLineItem = () => {
    setItems((currentItems) => [...currentItems, { ...lineItemTemplate }]);
  };

  const clearQuotation = () => {
    setQuotation(createEmptyQuotation());
    setItems([{ ...lineItemTemplate }]);
    setIncludeGst(true);
    setGstRate('18');
  };

  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + quantity * rate;
  }, 0);

  const gstPercentage = Number(gstRate) || 0;
  const tax = includeGst ? subtotal * (gstPercentage / 100) : 0;
  const total = subtotal + tax;

  useEffect(() => {
    fetch(apiUrl('/api/v1/auth/me'), { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          setAuthStatus('unauthenticated');
          setAuthExpiresAt(null);
          return;
        }
        const result = await response.json();
        setAuthExpiresAt(result.expiresAt ?? null);
        setAuthStatus('authenticated');
      })
      .catch(() => {
        // Keep the login screen usable while the API is starting.
        setAuthStatus('unauthenticated');
        setAuthExpiresAt(null);
      });
  }, []);

  useEffect(() => {
    if (authStatus === 'checking') {
      return;
    }
    if (authStatus !== 'authenticated' && pathname !== '/login') {
      navigate('/login', true);
    }
    if (authStatus === 'authenticated' && pathname === '/login') {
      navigate('/', true);
    }
  }, [authStatus, navigate, pathname]);

  useEffect(() => {
    if (!authExpiresAt || authStatus !== 'authenticated') {
      return undefined;
    }

    const millisecondsUntilExpiry = authExpiresAt * 1000 - Date.now();
    if (millisecondsUntilExpiry <= 0) {
      setAuthExpiresAt(null);
      setAuthStatus('unauthenticated');
      navigate('/login', true);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await fetch(apiUrl('/api/v1/auth/logout'), { method: 'POST', credentials: 'include' });
      } catch {
        // The cookie expiry is still the source of truth if the API is unreachable.
      }
      setAuthExpiresAt(null);
      setAuthStatus('unauthenticated');
      navigate('/login', true);
    }, millisecondsUntilExpiry);

    return () => window.clearTimeout(timeoutId);
  }, [authExpiresAt, authStatus, navigate]);

  const login = async ({ username, password }) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch(apiUrl('/api/v1/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setLoginError(result.error || 'Unable to sign in. Please try again.');
        return;
      }
      setAuthExpiresAt(result.expiresAt ?? null);
      setAuthStatus('authenticated');
      navigate('/', true);
    } catch {
      setLoginError('The login service is unavailable. Please try again shortly.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await fetch(apiUrl('/api/v1/auth/logout'), { method: 'POST', credentials: 'include' });
    setAuthExpiresAt(null);
    setAuthStatus('unauthenticated');
    navigate('/login', true);
  };

  const generateQuotation = (event) => {
    event.preventDefault();
    navigate('/quotation/preview');
  };

  const openPrintSettings = () => {
    const documentPreview = document.querySelector('.quotation-document');
    if (!documentPreview) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html><html><head><title>Door2Door Quotation</title><style>
      @page { size: A4 portrait; margin: 12mm; }
      body { margin: 0; color: #19334c; font: 12px Montserrat, Arial, sans-serif; }
      .quotation-document { border: 1px solid #d8e1dc; border-radius: 10px; overflow: hidden; }
      .document-header { display:flex; justify-content:space-between; padding:20px; color:#fff; background:#19334c; }
      .document-brand { display:flex; gap:10px; align-items:center; }.document-brand > span { padding:10px; background:#ead7a6; color:#19334c; font-weight:bold; }
      small, span { display:block; color:#607080; }.document-header small { color:#d7e3de; }.document-client { display:grid; grid-template-columns:1.15fr 1.3fr 1fr; gap:12px; padding:16px 20px; border-left:5px solid #3c766d; background:#f4f8f5; }.document-client strong { display:block; margin:4px 0; }
      .document-scope { padding:14px 20px; }.document-items { margin:16px 20px; border:1px solid #cddbd4; }.document-item { display:grid; grid-template-columns:2fr .45fr .8fr .9fr; gap:8px; padding:10px; border-top:1px solid #dce5e0; }.document-item.heading { color:#fff; background:#19334c; border:0; font-weight:bold; }.document-item span:not(:first-child), .document-item strong { text-align:right; }
      .document-total { margin-left:auto; width:280px; padding:0 20px 20px; }.document-total span { display:flex; justify-content:space-between; padding:5px 0; }.document-total .grand-total { margin-top:6px; padding:12px; color:#fff; background:#3c766d; }.document-total .grand-total strong { color:#fff; }.document-footer { padding:12px 20px; border-top:1px solid #dce5e0; text-align:center; }
    </style></head><body>${documentPreview.outerHTML}<script>window.onload = () => window.print();</script></body></html>`);
    printWindow.document.close();
  };

  const downloadPdf = async () => {
    const logo = await loadLogoForPdf(companyLogo);
    const populatedItems = items.filter((item) => item.description || item.rate);
    const printableItems = populatedItems.length ? populatedItems : [{ ...lineItemTemplate, description: 'No line items added' }];
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
    const pdfAmount = (amount) => `Rs. ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const shortText = (value, maxLength) => {
      const safeValue = String(value || 'Not provided');
      return safeValue.length > maxLength ? `${safeValue.slice(0, maxLength - 3)}...` : safeValue;
    };

    const quoteNumber = `D2D-INT-${(quotation.quoteDate || today).replaceAll('-', '')}`;
    const hasScope = quotation.scopeOfWork.trim().length > 0;
    rectangle(0, 0, 595, 842, [0.98, 0.97, 0.93]);
    rectangle(22, 22, 551, 798, [1, 1, 1]);
    border(22, 22, 551, 798, [0.14, 0.22, 0.24], 1.1);
    rectangle(22, 710, 551, 110, [0.11, 0.21, 0.26]);
    rectangle(22, 710, 551, 5, [0.72, 0.58, 0.35]);
    rectangle(48, 745, 235, 55, [1, 1, 1]);
    border(48, 745, 235, 55, [0.72, 0.58, 0.35], 0.8);
    commands.push('q 215 0 0 48 58 749 cm /Logo Do Q');
    text('QUOTATION', 434, 780, 10, 'F2', [0.94, 0.88, 0.75]);
    text(quoteNumber, 414, 763, 9, 'F1', [1, 1, 1]);
    text(`Issued ${quotation.quoteDate || today}`, 426, 747, 8, 'F1', [0.74, 0.84, 0.82]);

    rectangle(48, 630, 499, 56, [0.97, 0.98, 0.96]);
    border(48, 630, 499, 56, [0.67, 0.75, 0.71]);
    rectangle(48, 630, 6, 56, [0.22, 0.43, 0.42]);
    text('TO', 66, 669, 8, 'F2', [0.22, 0.43, 0.42]);
    text(shortText(quotation.clientName || 'Your Client', 26), 66, 652, 12, 'F2');
    text(shortText(quotation.phone || quotation.email || 'Mobile number to be added', 30), 66, 641, 8, 'F1', [0.37, 0.44, 0.53]);
    text('ADDRESS', 248, 669, 7, 'F2', [0.22, 0.43, 0.42]);
    text(shortText(quotation.siteLocation || 'Site location to be added', 28), 248, 652, 9, 'F1', [0.19, 0.28, 0.31]);
    text('PROJECT', 408, 669, 7, 'F2', [0.22, 0.43, 0.42]);
    text(shortText(quotation.projectName || 'Interior Project', 22), 408, 652, 9, 'F1', [0.19, 0.28, 0.31]);

    if (hasScope) {
      rectangle(48, 579, 499, 42, [0.98, 0.99, 0.98]);
      border(48, 579, 499, 42, [0.72, 0.8, 0.77]);
      rectangle(48, 579, 5, 42, [0.22, 0.43, 0.42]);
      text('SCOPE OF WORK', 65, 604, 8, 'F2', [0.22, 0.43, 0.42]);
      const scopeLines = wrapText(quotation.scopeOfWork, 88).slice(0, 2);
      scopeLines.forEach((scopeLine, index) => text(scopeLine, 65, 591 - index * 10, 8, 'F1', [0.37, 0.44, 0.53]));
    }

    const tableTop = hasScope ? 538 : 591;
    rectangle(48, tableTop, 499, 27, [0.11, 0.21, 0.26]);
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
      rectangle(totalX - 12, totalsTop - 62, 217, 36, [0.22, 0.43, 0.42]);
      border(totalX - 12, totalsTop - 62, 217, 36, [0.12, 0.29, 0.29], 1);
      text('TOTAL ESTIMATE', totalX, totalsTop - 48, 10, 'F2', [1, 1, 1]);
      text(pdfAmount(total), 464, totalsTop - 48, 12, 'F2', [1, 1, 1]);
      const termsY = Math.min(totalsTop - 94, 142);
      if (termsY > 122) {
        rectangle(48, termsY - 41, 499, 45, [0.98, 0.97, 0.93]);
        border(48, termsY - 41, 499, 45, [0.78, 0.69, 0.53]);
        text('COMMERCIAL NOTES', 61, termsY - 10, 8, 'F2', [0.5, 0.4, 0.24]);
        text('This quotation is valid for 15 days. Final quantities and scope are subject to site measurement.', 61, termsY - 25, 8, 'F1', [0.37, 0.44, 0.53]);
      }
    } else {
      text('Continued on the next page', 396, 110, 8, 'F2', [0.22, 0.43, 0.42]);
    }
    line(48, 78, 547, 78, [0.72, 0.58, 0.35]);
    text('Call Us: 8739033003, 7007690998  |  Email: help@door2doorexperts.com', 58, 64, 7, 'F1', [0.37, 0.44, 0.53]);
    text('Near Millennium City Rapti Nagar Phase -4 Chargawa, 273013', 58, 52, 7, 'F1', [0.37, 0.44, 0.53]);
    text('Gorakhpur, Uttar Pradesh', 58, 40, 7, 'F1', [0.37, 0.44, 0.53]);
    text(`Page 1 of ${itemPages.length}`, 470, 40, 7, 'F1', [0.48, 0.55, 0.64]);

    const pageContents = [commands.join('\n')];
    itemPages.slice(1).forEach((pageItems, pageIndex) => {
      commands = [];
      rectangle(0, 0, 595, 842, [0.98, 0.97, 0.93]);
      rectangle(22, 22, 551, 798, [1, 1, 1]);
      border(22, 22, 551, 798, [0.14, 0.22, 0.24], 1.1);
      rectangle(22, 710, 551, 110, [0.11, 0.21, 0.26]);
      rectangle(22, 710, 551, 5, [0.72, 0.58, 0.35]);
      rectangle(48, 745, 235, 55, [1, 1, 1]);
      border(48, 745, 235, 55, [0.72, 0.58, 0.35], 0.8);
      commands.push('q 215 0 0 48 58 749 cm /Logo Do Q');
      text('QUOTATION - ITEMS CONTINUED', 365, 770, 9, 'F2', [0.94, 0.88, 0.75]);
      text(quoteNumber, 414, 752, 8, 'F1', [1, 1, 1]);
      const continuationTop = 650;
      rectangle(48, continuationTop, 499, 27, [0.11, 0.21, 0.26]);
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
        rectangle(totalX - 12, totalsTop - 62, 217, 36, [0.22, 0.43, 0.42]);
        border(totalX - 12, totalsTop - 62, 217, 36, [0.12, 0.29, 0.29], 1);
        text('TOTAL ESTIMATE', totalX, totalsTop - 48, 10, 'F2', [1, 1, 1]);
        text(pdfAmount(total), 464, totalsTop - 48, 12, 'F2', [1, 1, 1]);
      } else {
        text('Continued on the next page', 396, 110, 8, 'F2', [0.22, 0.43, 0.42]);
      }
      line(48, 78, 547, 78, [0.72, 0.58, 0.35]);
      text('Call Us: 8739033003, 7007690998  |  Email: help@door2doorexperts.com', 58, 64, 7, 'F1', [0.37, 0.44, 0.53]);
      text('Near Millennium City Rapti Nagar Phase -4 Chargawa, 273013', 58, 52, 7, 'F1', [0.37, 0.44, 0.53]);
      text('Gorakhpur, Uttar Pradesh', 58, 40, 7, 'F1', [0.37, 0.44, 0.53]);
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
    link.download = `Door2Door-Quotation-${quotation.clientName || 'Draft'}.pdf`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  if (authStatus === 'checking') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} error={loginError} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <img className="company-logo header-logo" src={companyLogo} alt="Door2Door Experts" />
        <button
          type="button"
          className="primary-action desktop-only"
          onClick={() => navigate('/quotation/new')}
        >
          Create New Quotation
        </button>
        <button type="button" className="logout-action" onClick={logout}>Log out</button>
      </header>

      <main className="page-content">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Elegant proposals for inspired spaces</p>
            <h2>Design quotations that feel as premium as your interiors.</h2>
            <p className="hero-text">
              Build client-ready estimates for modular kitchens, wardrobes,
              living spaces, and complete home transformations from one clean
              screen.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => navigate('/quotation/new')}
              >
                Create New Quotation
              </button>
            </div>
          </div>

          <div className="hero-panel">
            <div className="proposal-panel">
              <p className="eyebrow">Proposal workflow</p>
              <h3>From room brief to a client-ready estimate.</h3>
              <div className="proposal-steps">
                <div><span>01</span><p>Capture the project brief and site details.</p></div>
                <div><span>02</span><p>Build a clear, itemized interior estimate.</p></div>
                <div><span>03</span><p>Share a polished quotation with confidence.</p></div>
              </div>
            </div>
          </div>
        </section>

        {(pathname === '/quotation/new' || pathname === '/quotation/preview') && (
          <div className="form-modal-backdrop" role="presentation" onMouseDown={() => navigate('/', true)}>
          <section className="form-card form-workspace-modal" role="dialog" aria-modal="true" aria-labelledby="quotation-workspace-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Quotation Workspace</p>
                <h3 id="quotation-workspace-title">Create a new quotation</h3>
              </div>
              <p className="section-text">
                Fill in project details, add pricing lines, and review totals
                instantly.
              </p>
              <button type="button" className="workspace-close" aria-label="Close quotation workspace" onClick={() => navigate('/', true)}>x</button>
            </div>

            <form className="quotation-form" onSubmit={generateQuotation}>
              <div className="form-grid">
                <label>
                  Client Name
                  <input type="text" value={quotation.clientName} onChange={(event) => handleQuotationChange('clientName', event.target.value)} placeholder="Enter client name" />
                </label>
                <label>
                  Project Name
                  <input type="text" value={quotation.projectName} onChange={(event) => handleQuotationChange('projectName', event.target.value)} placeholder="3BHK Interior Package" />
                </label>
                <label>
                  Phone Number
                  <input type="tel" value={quotation.phone} onChange={(event) => handleQuotationChange('phone', event.target.value)} placeholder="+91 98765 43210" />
                </label>
                <label>
                  Email Address
                  <input type="email" value={quotation.email} onChange={(event) => handleQuotationChange('email', event.target.value)} placeholder="client@email.com" />
                </label>
                <label>
                  Site Location
                  <input type="text" value={quotation.siteLocation} onChange={(event) => handleQuotationChange('siteLocation', event.target.value)} placeholder="Project address" />
                </label>
                <label>
                  Quote Date
                  <input type="date" value={quotation.quoteDate} onChange={(event) => handleQuotationChange('quoteDate', event.target.value)} />
                </label>
              </div>

              <label className="full-width">
                Scope of Work
                <textarea
                  rows="4"
                  value={quotation.scopeOfWork}
                  onChange={(event) => handleQuotationChange('scopeOfWork', event.target.value)}
                  placeholder="Describe rooms, finishes, materials, and installation details."
                />
              </label>

              <div className="line-items">
                <div className="line-items-header">
                  <h4>Items</h4>
                </div>

                {items.map((item, index) => (
                  <div className="line-item-row" key={`item-${index}`}>
                    <label>
                      Description
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          handleItemChange(index, 'description', event.target.value)
                        }
                        placeholder="Wardrobe, kitchen shutters, TV unit..."
                      />
                    </label>
                    <label>
                      Qty
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(index, 'quantity', event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Rate
                      <input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(event) =>
                          handleItemChange(index, 'rate', event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-item-action"
                  onClick={addLineItem}
                >
                  + Add another item
                </button>
              </div>

              <div className="gst-controls">
                <label className="gst-toggle">
                  <input type="checkbox" checked={includeGst} onChange={(event) => setIncludeGst(event.target.checked)} />
                  <span>Include GST in this quotation</span>
                </label>
                {includeGst && (
                  <label className="gst-rate">
                    GST Rate (%)
                    <input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(event) => setGstRate(event.target.value)} />
                  </label>
                )}
              </div>

              <div className="summary-card">
                <div>
                  <span>Subtotal</span>
                  <strong>₹ {subtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span>{includeGst ? `GST (${gstPercentage}%)` : 'GST (not included)'}</span>
                  <strong>₹ {tax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                </div>
                <div className="summary-total">
                  <span>Total Estimate</span>
                  <strong>
                    ₹{' '}
                    {total.toLocaleString('en-IN', {
                      maximumFractionDigits: 0,
                    })}
                  </strong>
                </div>
              </div>

              <div className="footer-actions">
                <button type="button" className="clean-slate-action" onClick={clearQuotation}>
                  Clean Slate
                </button>
                <button type="submit" className="primary-action">
                  Generate Quotation
                </button>
              </div>
            </form>
          </section>
          </div>
        )}
      </main>

      {pathname === '/quotation/preview' && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => navigate('/quotation/new', true)}>
          <section className="quotation-modal" role="dialog" aria-modal="true" aria-labelledby="quotation-preview-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-actions">
              <div>
                <p className="eyebrow">Ready to share</p>
                <h2 id="quotation-preview-title">Quotation Preview</h2>
              </div>
              <button type="button" className="close-button" aria-label="Close quotation preview" onClick={() => navigate('/quotation/new', true)}>x</button>
            </div>
            <article className="quotation-document">
              <div className="document-header">
                <div className="document-brand"><span>D2D</span><div><strong>Door2Door Interiors</strong><small>Interior design quotation</small></div></div>
                <div><strong>QUOTATION</strong><small>{quotation.quoteDate || today}</small></div>
              </div>
              <div className="document-client"><div><small>TO</small><strong>{quotation.clientName || 'Your Client'}</strong><span>{quotation.phone || quotation.email || 'Mobile number to be added'}</span></div><div><small>ADDRESS</small><strong>{quotation.siteLocation || 'Site location to be added'}</strong></div><div><small>PROJECT</small><strong>{quotation.projectName || 'Interior Project'}</strong></div></div>
              <div className="document-scope"><small>SCOPE OF WORK</small><p>{quotation.scopeOfWork || 'Project scope will be added here.'}</p></div>
              <div className="document-items"><div className="document-item heading"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{items.filter((item) => item.description || item.rate).map((item, index) => <div className="document-item" key={`preview-${index}`}><span>{item.description || 'Untitled item'}</span><span>{item.quantity || 0}</span><span>{currency(Number(item.rate) || 0)}</span><strong>{currency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</strong></div>)}</div>
              <div className="document-total"><span>Subtotal <strong>{currency(subtotal)}</strong></span>{includeGst && <span>GST ({gstPercentage}%) <strong>{currency(tax)}</strong></span>}<span className="grand-total">Total Estimate <strong>{currency(total)}</strong></span></div>
              <p className="document-footer">Thank you for choosing Door2Door Interiors. This quotation is valid for 15 days.</p>
            </article>
            <div className="preview-export-actions">
              <button type="button" className="secondary-action" onClick={openPrintSettings}>Print / Save as PDF</button>
              <button type="button" className="primary-action" onClick={downloadPdf}>Download as PDF</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
