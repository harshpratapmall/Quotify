import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import companyLogo from './assets/d2d-experts-logo.webp';
import Dashboard from './components/Dashboard';
import AdminUsers from './components/AdminUsers';
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
import { ANALYTICS_EVENTS, trackAction, trackRoute } from './utils/analytics';
import './App.css';

const isAdminUser = (user) => user?.role?.toLowerCase() === 'admin';

function App() {
  const { pathname, navigate } = useAppRouter();
  const initialPathname = useRef(pathname);
  const [draftState] = useState(() => createDraftState(null, pathname === APP_ROUTES.quotationNew));
  const [authStatus, setAuthStatus] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);
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
  const authenticatedHome = isAdminUser(currentUser) ? APP_ROUTES.adminUsers : APP_ROUTES.home;

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

  const startNewQuotation = useCallback((source) => {
    trackAction(ANALYTICS_EVENTS.quotationStarted, { source });
    clearQuotation();
    navigate(APP_ROUTES.quotationNew);
  }, [clearQuotation, navigate]);

  const saveQuotation = useCallback(async (source) => {
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      trackAction(ANALYTICS_EVENTS.quotationSaveFailed, { source, reason: 'validation' });
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
      trackAction(ANALYTICS_EVENTS.quotationSaveSucceeded, {
        source,
        action: activeQuotationId ? 'updated' : 'created',
      });
      return true;
    } catch {
      setSaveStatus('Unable to save. Please try again.');
      trackAction(ANALYTICS_EVENTS.quotationSaveFailed, { source, reason: 'request' });
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
    trackAction(ANALYTICS_EVENTS.quotationOpened, { mode: preview ? 'preview' : 'edit' });
    navigate(preview ? APP_ROUTES.quotationPreview : APP_ROUTES.quotationNew);
  }, [navigate]);

  const deleteSavedQuotation = useCallback(async (id) => {
    trackAction(ANALYTICS_EVENTS.quotationDeleteRequested);
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
      trackAction(ANALYTICS_EVENTS.quotationDeleted);
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

        setCurrentUser(data?.user ?? null);
        setAuthExpiresAt(data?.expiresAt ?? null);
        setAuthStatus('authenticated');
      })
      .catch(() => {
        setAuthStatus('unauthenticated');
        setAuthExpiresAt(null);
      });
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser?.id) {
      return;
    }

    const nextState = createDraftState(loadQuotationDraft(currentUser.id), initialPathname.current === APP_ROUTES.quotationNew);
    setQuotation(nextState.quotation);
    setItems(nextState.items);
    setIncludeGst(nextState.includeGst);
    setGstRate(nextState.gstRate);
    setActiveQuotationId(nextState.activeQuotationId);
    setPreviewOnly(false);
    setSaveStatus('');
    listQuotations()
      .then((quotes) => setSavedQuotations(quotes))
      .catch(() => setSavedQuotations([]));
  }, [authStatus, currentUser]);

  useEffect(() => {
    if (authStatus !== 'checking') {
      trackRoute(pathname);
    }
  }, [authStatus, pathname]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }
    saveQuotationDraft(currentUser.id, {
      quotation,
      items,
      includeGst,
      gstRate,
      activeQuotationId,
    });
  }, [currentUser, quotation, items, includeGst, gstRate, activeQuotationId]);

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
      navigate(authenticatedHome, true);
    }

    if (authStatus === 'authenticated' && pathname === APP_ROUTES.adminUsers && !isAdminUser(currentUser)) {
      navigate(APP_ROUTES.home, true);
    }
  }, [authStatus, authenticatedHome, currentUser, navigate, pathname]);

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
    trackAction(ANALYTICS_EVENTS.loginSubmitted);

    try {
      const { response, data } = await loginRequest({ username, password });
      if (!response.ok) {
        setLoginError(data?.error || 'Unable to sign in. Please try again.');
        trackAction(ANALYTICS_EVENTS.loginFailed, { reason: 'rejected' });
        return;
      }

      setCurrentUser(data?.user ?? null);
      setAuthExpiresAt(data?.expiresAt ?? null);
      setAuthStatus('authenticated');
      trackAction(ANALYTICS_EVENTS.loginSucceeded);
      navigate(isAdminUser(data?.user) ? APP_ROUTES.adminUsers : APP_ROUTES.home, true);
    } catch {
      setLoginError('The login service is unavailable. Please try again shortly.');
      trackAction(ANALYTICS_EVENTS.loginFailed, { reason: 'unavailable' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    trackAction(ANALYTICS_EVENTS.logoutRequested);
    await logoutRequest();
    clearQuotation();
    setCurrentUser(null);
    setSavedQuotations([]);
    setAuthExpiresAt(null);
    setAuthStatus('unauthenticated');
    navigate(APP_ROUTES.login, true);
  };

  const generateQuotation = (event) => {
    event.preventDefault();
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      trackAction(ANALYTICS_EVENTS.quotationPreviewFailed, { reason: 'validation' });
      return;
    }

    trackAction(ANALYTICS_EVENTS.quotationPreviewed);
    setPreviewOnly(false);
    navigate(APP_ROUTES.quotationPreview);
  };

  const handleDownloadPdf = async (source) => {
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      trackAction(ANALYTICS_EVENTS.quotationPdfDownloadFailed, { source, reason: 'validation' });
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
    trackAction(ANALYTICS_EVENTS.quotationPdfDownloaded, { source });
  };

  if (authStatus === 'checking') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} error={loginError} />;
  }

  if (pathname === APP_ROUTES.adminUsers && isAdminUser(currentUser)) {
    return <AdminUsers navigate={navigate} currentUser={currentUser} />;
  }

  return (
    <>
      <Dashboard
        companyLogo={companyLogo}
        user={currentUser}
        navigate={navigate}
        logout={logout}
        startNewQuotation={startNewQuotation}
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
