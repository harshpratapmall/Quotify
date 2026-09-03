import { useCallback, useEffect, useMemo, useState } from 'react';
import companyLogo from './assets/d2d-experts-logo.webp';
import Dashboard from './components/Dashboard';
import LoginScreen from './components/LoginScreen';
import QuotationPreviewModal from './components/QuotationPreviewModal';
import QuotationWorkspaceModal from './components/QuotationWorkspaceModal';
import { createEmptyQuotation, defaultGstRate, lineItemTemplate } from './config/quotation';
import { APP_ROUTES } from './config/routes';
import { useAppRouter } from './hooks/useAppRouter';
import { fetchSession, loginRequest, logoutRequest } from './services/auth';
import {
  deleteQuotationRequest,
  fetchQuotationById,
  listQuotations,
  saveQuotationRequest,
} from './services/quotations';
import { downloadQuotationPdf } from './utils/pdf';
import {
  buildQuotationPayload,
  calculateQuotationTotals,
  getQuotationValidationError,
  parseSavedQuotationPayload,
} from './utils/quotation';
import { createDraftState, loadQuotationDraft, saveQuotationDraft } from './utils/storage';
import './App.css';

function App() {
  const { pathname, navigate } = useAppRouter();
  const [draftState] = useState(() => createDraftState(loadQuotationDraft()));
  const [authStatus, setAuthStatus] = useState('checking');
  const [authExpiresAt, setAuthExpiresAt] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [items, setItems] = useState(draftState.items);
  const [includeGst, setIncludeGst] = useState(draftState.includeGst);
  const [gstRate, setGstRate] = useState(draftState.gstRate);
  const [quotation, setQuotation] = useState(draftState.quotation);
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [activeQuotationId, setActiveQuotationId] = useState(draftState.activeQuotationId);
  const [saveStatus, setSaveStatus] = useState('');
  const [previewOnly, setPreviewOnly] = useState(false);

  const { subtotal, gstPercentage, tax, total } = useMemo(
    () => calculateQuotationTotals(items, includeGst, gstRate),
    [items, includeGst, gstRate]
  );

  const quotationValidationError = useCallback(
    () => getQuotationValidationError(quotation, items),
    [quotation, items]
  );

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

  const removeLineItem = (index) => {
    setItems((currentItems) => currentItems.length === 1
      ? currentItems
      : currentItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearQuotation = useCallback(() => {
    setQuotation(createEmptyQuotation());
    setItems([{ ...lineItemTemplate }]);
    setIncludeGst(true);
    setGstRate(defaultGstRate);
    setActiveQuotationId(null);
    setSaveStatus('');
    setPreviewOnly(false);
  }, []);

  const saveQuotation = useCallback(async () => {
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      return false;
    }

    setSaveStatus('Saving...');

    try {
      const payload = buildQuotationPayload({
        quotation,
        items,
        includeGst,
        gstRate,
        subtotal,
        tax,
        total,
      });
      const { response, data } = await saveQuotationRequest(activeQuotationId, payload);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save quotation.');
      }

      setActiveQuotationId(data.id);
      setSavedQuotations((current) => [data, ...current.filter((entry) => entry.id !== data.id)]);
      setSaveStatus('Saved');
      return true;
    } catch {
      setSaveStatus('Unable to save. Please try again.');
      return false;
    }
  }, [activeQuotationId, gstRate, includeGst, items, quotation, quotationValidationError, subtotal, tax, total]);

  const openSavedQuotation = useCallback(async (id, preview = false) => {
    const saved = await fetchQuotationById(id);
    if (!saved) {
      return;
    }

    const nextState = parseSavedQuotationPayload(saved);
    setQuotation(nextState.quotation);
    setItems(nextState.items);
    setIncludeGst(nextState.includeGst);
    setGstRate(nextState.gstRate);
    setActiveQuotationId(saved.id);
    setSaveStatus('');
    setPreviewOnly(preview);
    navigate(preview ? APP_ROUTES.quotationPreview : APP_ROUTES.quotationNew);
  }, [navigate]);

  const deleteSavedQuotation = useCallback(async (id) => {
    if (!window.confirm('Delete this saved quotation?')) {
      return;
    }

    const response = await deleteQuotationRequest(id);
    if (response.ok) {
      setSavedQuotations((current) => current.filter((entry) => entry.id !== id));
      if (activeQuotationId === id) {
        clearQuotation();
      }
      setSaveStatus('Quotation deleted');
    } else {
      setSaveStatus('Unable to delete quotation. Please try again.');
    }
  }, [activeQuotationId, clearQuotation]);

  useEffect(() => {
    fetchSession()
      .then(({ response, data }) => {
        if (!response.ok) {
          setAuthStatus('unauthenticated');
          setAuthExpiresAt(null);
          return;
        }

        setAuthExpiresAt(data?.expiresAt ?? null);
        setAuthStatus('authenticated');
      })
      .catch(() => {
        setAuthStatus('unauthenticated');
        setAuthExpiresAt(null);
      });
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return;
    }

    listQuotations()
      .then((quotes) => setSavedQuotations(quotes))
      .catch(() => setSavedQuotations([]));
  }, [authStatus]);

  useEffect(() => {
    saveQuotationDraft({
      quotation,
      items,
      includeGst,
      gstRate,
      activeQuotationId,
    });
  }, [quotation, items, includeGst, gstRate, activeQuotationId]);

  useEffect(() => {
    if (pathname !== APP_ROUTES.quotationPreview) {
      return;
    }

    const validationError = quotationValidationError();
    if (!validationError) {
      return;
    }

    setSaveStatus(validationError);
    setPreviewOnly(false);
    navigate(APP_ROUTES.quotationNew, true);
  }, [navigate, pathname, quotationValidationError]);

  useEffect(() => {
    if (authStatus === 'checking') {
      return;
    }

    if (authStatus !== 'authenticated' && pathname !== APP_ROUTES.login) {
      navigate(APP_ROUTES.login, true);
    }

    if (authStatus === 'authenticated' && pathname === APP_ROUTES.login) {
      navigate(APP_ROUTES.home, true);
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
      navigate(APP_ROUTES.login, true);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await logoutRequest();
      } catch {
        // The cookie expiry is still the source of truth if the API is unreachable.
      }
      setAuthExpiresAt(null);
      setAuthStatus('unauthenticated');
      navigate(APP_ROUTES.login, true);
    }, millisecondsUntilExpiry);

    return () => window.clearTimeout(timeoutId);
  }, [authExpiresAt, authStatus, navigate]);

  const login = async ({ username, password }) => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { response, data } = await loginRequest({ username, password });
      if (!response.ok) {
        setLoginError(data?.error || 'Unable to sign in. Please try again.');
        return;
      }

      setAuthExpiresAt(data?.expiresAt ?? null);
      setAuthStatus('authenticated');
      navigate(APP_ROUTES.home, true);
    } catch {
      setLoginError('The login service is unavailable. Please try again shortly.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await logoutRequest();
    setAuthExpiresAt(null);
    setAuthStatus('unauthenticated');
    navigate(APP_ROUTES.login, true);
  };

  const generateQuotation = (event) => {
    event.preventDefault();
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      return;
    }

    setPreviewOnly(false);
    navigate(APP_ROUTES.quotationPreview);
  };

  const handleDownloadPdf = async () => {
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      navigate(APP_ROUTES.quotationNew, true);
      return;
    }

    await downloadQuotationPdf({
      quotation,
      items,
      includeGst,
      gstPercentage,
      subtotal,
      tax,
      total,
      activeQuotationId,
      logoSource: companyLogo,
    });
  };

  if (authStatus === 'checking') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} error={loginError} />;
  }

  return (
    <>
      <Dashboard
        companyLogo={companyLogo}
        navigate={navigate}
        logout={logout}
        clearQuotation={clearQuotation}
        openSavedQuotation={openSavedQuotation}
        deleteSavedQuotation={deleteSavedQuotation}
        savedQuotations={savedQuotations}
        saveStatus={saveStatus}
      />
      <QuotationWorkspaceModal
        pathname={pathname}
        previewOnly={previewOnly}
        navigate={navigate}
        activeQuotationId={activeQuotationId}
        quotation={quotation}
        items={items}
        includeGst={includeGst}
        gstRate={gstRate}
        gstPercentage={gstPercentage}
        subtotal={subtotal}
        tax={tax}
        total={total}
        saveStatus={saveStatus}
        handleQuotationChange={handleQuotationChange}
        handleItemChange={handleItemChange}
        removeLineItem={removeLineItem}
        addLineItem={addLineItem}
        setIncludeGst={setIncludeGst}
        setGstRate={setGstRate}
        clearQuotation={clearQuotation}
        saveQuotation={saveQuotation}
        generateQuotation={generateQuotation}
      />
      <QuotationPreviewModal
        pathname={pathname}
        previewOnly={previewOnly}
        quotation={quotation}
        items={items}
        includeGst={includeGst}
        gstPercentage={gstPercentage}
        subtotal={subtotal}
        tax={tax}
        total={total}
        activeQuotationId={activeQuotationId}
        saveQuotation={saveQuotation}
        downloadPdf={handleDownloadPdf}
        navigate={navigate}
      />
    </>
  );
}

export default App;
