import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dashboard from './components/Dashboard';
import AdminUsers from './components/AdminUsers';
import Clients from './components/Clients';
import PublicShare from './components/PublicShare';
import Templates from './components/Templates';
import BusinessProfile from './components/BusinessProfile';
import LoginScreen from './components/LoginScreen';
import QuotationPreviewModal from './components/QuotationPreviewModal';
import QuotationWorkspaceModal from './components/QuotationWorkspaceModal';
import DocumentLibraryModal from './components/DocumentLibraryModal';
import { createEmptyQuotation, defaultGstRate, lineItemTemplate } from './config/quotation';
import { APP_ROUTES } from './config/routes';
import { useAppRouter } from './hooks/useAppRouter';
import { fetchSession, loginRequest, logoutRequest, startGoogleLogin } from './services/auth';
import {
  deleteDocumentRequest,
  fetchDocumentById,
  listDocuments,
  saveDocumentRequest,
  createDocumentShare,
  convertQuotationToBill,
} from './services/documents';
import { downloadQuotationPdf } from './utils/pdf';
import { fetchBusinessProfile, saveBusinessProfile } from './services/businessProfile';
import {
  buildQuotationPayload,
  calculateQuotationTotals,
  getQuotationValidationError,
  parseSavedQuotationPayload,
} from './utils/quotation';
import { createDraftState, loadQuotationDraft, saveQuotationDraft } from './utils/storage';
import { ANALYTICS_EVENTS, trackAction, trackRoute } from './utils/analytics';
import { DOCUMENT_TYPES, documentCopy } from './config/documents';
import './App.css';

const isAdminUser = (user) => user?.role?.toLowerCase() === 'admin';

function App() {
  const { pathname, navigate } = useAppRouter();
  const initialPathname = useRef(pathname);
  const [draftState] = useState(() => createDraftState(null, pathname === APP_ROUTES.quotationNew || pathname === APP_ROUTES.billNew));
  const [authStatus, setAuthStatus] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);
  const [authExpiresAt, setAuthExpiresAt] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(() => new URLSearchParams(window.location.search).get('oauth_error') || '');
  const [items, setItems] = useState(draftState.items);
  const [includeGst, setIncludeGst] = useState(draftState.includeGst);
  const [gstRate, setGstRate] = useState(draftState.gstRate);
  const [quotation, setQuotation] = useState(draftState.quotation);
  const [savedDocuments, setSavedDocuments] = useState({ quotation: [], bill: [] });
  const [activeQuotationId, setActiveQuotationId] = useState(draftState.activeQuotationId);
  const [documentType, setDocumentType] = useState(pathname === APP_ROUTES.billNew ? DOCUMENT_TYPES.bill : DOCUMENT_TYPES.quotation);
  const [saveStatus, setSaveStatus] = useState('');
  const [previewOnly, setPreviewOnly] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({});
  const [activeShareUrl, setActiveShareUrl] = useState('');
  const authenticatedHome = isAdminUser(currentUser) ? APP_ROUTES.adminUsers : APP_ROUTES.home;
  const document = documentCopy(documentType);
  const isPublicShare = pathname.startsWith('/share/');

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
    setActiveShareUrl('');
    setSaveStatus('');
    setPreviewOnly(false);
  }, []);

  const startNewDocument = useCallback((type, source) => {
    setDocumentType(type);
    trackAction(ANALYTICS_EVENTS.quotationStarted, { source, documentType: type });
    clearQuotation();
    navigate(type === DOCUMENT_TYPES.bill ? APP_ROUTES.billNew : APP_ROUTES.quotationNew);
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
      const { response, data } = await saveDocumentRequest(documentType, activeQuotationId, payload);
      if (!response.ok) {
        throw new Error(data?.error || `Unable to save ${document.singular.toLowerCase()}.`);
      }

      setActiveQuotationId(data.id);
      setSavedDocuments((current) => ({
        ...current,
        [documentType]: [data, ...current[documentType].filter((entry) => entry.id !== data.id)],
      }));
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
  }, [activeQuotationId, document.singular, documentType, gstRate, includeGst, items, quotation, quotationValidationError, subtotal, tax, total]);

  const openSavedDocument = useCallback(async (type, id, preview = false) => {
    const saved = await fetchDocumentById(type, id);
    if (!saved) {
      return;
    }

    const nextState = parseSavedQuotationPayload(saved);
    setQuotation(nextState.quotation);
    setItems(nextState.items);
    setIncludeGst(nextState.includeGst);
    setGstRate(nextState.gstRate);
    setActiveQuotationId(saved.id);
    setDocumentType(type);
    setActiveShareUrl('');
    setSaveStatus('');
    setPreviewOnly(preview);
    trackAction(ANALYTICS_EVENTS.quotationOpened, { mode: preview ? 'preview' : 'edit', documentType: type });
    navigate(preview ? (type === DOCUMENT_TYPES.bill ? APP_ROUTES.billPreview : APP_ROUTES.quotationPreview) : (type === DOCUMENT_TYPES.bill ? APP_ROUTES.billNew : APP_ROUTES.quotationNew));
  }, [navigate]);

  const deleteSavedDocument = useCallback(async (type, id) => {
    const copy = documentCopy(type);
    trackAction(ANALYTICS_EVENTS.quotationDeleteRequested, { documentType: type });
    if (!window.confirm(`Delete this saved ${copy.singular.toLowerCase()}?`)) {
      return;
    }

    const response = await deleteDocumentRequest(type, id);
    if (response.ok) {
      setSavedDocuments((current) => ({ ...current, [type]: current[type].filter((entry) => entry.id !== id) }));
      if (activeQuotationId === id && documentType === type) {
        clearQuotation();
      }
      setSaveStatus(`${copy.singular} deleted`);
      trackAction(ANALYTICS_EVENTS.quotationDeleted, { documentType: type });
    } else {
      setSaveStatus(`Unable to delete ${copy.singular.toLowerCase()}. Please try again.`);
    }
  }, [activeQuotationId, clearQuotation, documentType]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('oauth_error')) {
      params.delete('oauth_error');
      const nextQuery = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    if (isPublicShare) {
      return undefined;
    }
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
  }, [isPublicShare]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser?.id) {
      return;
    }

    const initialType = initialPathname.current === APP_ROUTES.billNew ? DOCUMENT_TYPES.bill : DOCUMENT_TYPES.quotation;
    const nextState = createDraftState(loadQuotationDraft(currentUser.id, initialType), initialPathname.current === APP_ROUTES.quotationNew || initialPathname.current === APP_ROUTES.billNew);
    setQuotation(nextState.quotation);
    setItems(nextState.items);
    setIncludeGst(nextState.includeGst);
    setGstRate(nextState.gstRate);
    setActiveQuotationId(nextState.activeQuotationId);
    setDocumentType(initialType);
    setPreviewOnly(false);
    setSaveStatus('');
    Promise.all([listDocuments(DOCUMENT_TYPES.quotation), listDocuments(DOCUMENT_TYPES.bill)])
      .then(([quotations, bills]) => setSavedDocuments({ quotation: quotations, bill: bills }))
      .catch(() => setSavedDocuments({ quotation: [], bill: [] }));
    fetchBusinessProfile().then(({ response, data }) => response.ok && setBusinessProfile(data || {}));
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
    }, documentType);
  }, [currentUser, quotation, items, includeGst, gstRate, activeQuotationId, documentType]);

  useEffect(() => {
    if (pathname !== APP_ROUTES.quotationPreview && pathname !== APP_ROUTES.billPreview) {
      return;
    }

    const validationError = quotationValidationError();
    if (!validationError) {
      return;
    }

    setSaveStatus(validationError);
    setPreviewOnly(false);
    navigate(pathname === APP_ROUTES.billPreview ? APP_ROUTES.billNew : APP_ROUTES.quotationNew, true);
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
    setSavedDocuments({ quotation: [], bill: [] });
    setAuthExpiresAt(null);
    setAuthStatus('unauthenticated');
    navigate(APP_ROUTES.login, true);
  };

  const createShare = async () => {
    if (!activeQuotationId) {
      setSaveStatus('Save the quotation before creating a share link.');
      return;
    }
    const { response, data } = await createDocumentShare(documentType, activeQuotationId);
    if (!response.ok) {
      setSaveStatus(data?.error || 'Unable to create share link.');
      return;
    }
    setActiveShareUrl(data.url || '');
    setSaveStatus('Share link ready.');
  };

  const convertCurrentQuotationToBill = async () => {
    if (!activeQuotationId || documentType !== DOCUMENT_TYPES.quotation) return;
    const { response, data } = await convertQuotationToBill(activeQuotationId);
    if (!response.ok) {
      setSaveStatus(data?.error || 'Unable to create bill.');
      return;
    }
    const nextState = parseSavedQuotationPayload(data);
    setQuotation(nextState.quotation);
    setItems(nextState.items);
    setIncludeGst(nextState.includeGst);
    setGstRate(nextState.gstRate);
    setActiveQuotationId(data.id);
    setDocumentType(DOCUMENT_TYPES.bill);
    setPreviewOnly(false);
    setActiveShareUrl('');
    navigate(APP_ROUTES.billNew, true);
  };

  const generateQuotation = (event) => {
    event.preventDefault();
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      trackAction(ANALYTICS_EVENTS.quotationPreviewFailed, { reason: 'validation', documentType });
      return;
    }

    trackAction(ANALYTICS_EVENTS.quotationPreviewed, { documentType });
    setPreviewOnly(false);
    navigate(documentType === DOCUMENT_TYPES.bill ? APP_ROUTES.billPreview : APP_ROUTES.quotationPreview);
  };

  const handleDownloadPdf = async (source) => {
    const validationError = quotationValidationError();
    if (validationError) {
      setSaveStatus(validationError);
      trackAction(ANALYTICS_EVENTS.quotationPdfDownloadFailed, { source, reason: 'validation' });
      navigate(APP_ROUTES.quotationNew, true);
      return;
    }

    try {
      await downloadQuotationPdf({
        quotation,
        items,
        includeGst,
        gstPercentage,
        subtotal,
        tax,
        total,
        activeQuotationId,
        logoSource: businessProfile.logoUrl,
        businessProfile,
        documentType,
      });
      trackAction(ANALYTICS_EVENTS.quotationPdfDownloaded, { source, documentType });
    } catch (error) {
      setSaveStatus('Unable to download the PDF. Please try again.');
      trackAction(ANALYTICS_EVENTS.quotationPdfDownloadFailed, { source, reason: 'generation' });
    }
  };

  if (isPublicShare) {
    return <PublicShare token={pathname.slice('/share/'.length)} />;
  }

  if (authStatus === 'checking') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <LoginScreen onLogin={login} onGoogleLogin={startGoogleLogin} isLoggingIn={isLoggingIn} error={loginError} />;
  }

  if (pathname === APP_ROUTES.adminUsers && isAdminUser(currentUser)) {
    return <AdminUsers navigate={navigate} currentUser={currentUser} logout={logout} />;
  }
  if (pathname === APP_ROUTES.clients) {
    return <Clients navigate={navigate} />;
  }
  if (pathname === APP_ROUTES.templates) {
    return <Templates navigate={navigate} />;
  }
  if (pathname === APP_ROUTES.businessProfile) return <BusinessProfile profile={businessProfile} setProfile={setBusinessProfile} navigate={navigate} saveProfile={async (profile) => { const { response, data } = await saveBusinessProfile(profile); if (response.ok) setBusinessProfile(data); return response.ok; }} />;

  return (
    <>
      <Dashboard
        profile={businessProfile}
        user={currentUser}
        pathname={pathname}
        navigate={navigate}
        logout={logout}
        startNewDocument={startNewDocument}
        savedDocuments={savedDocuments}
      />
      <DocumentLibraryModal pathname={pathname} documents={savedDocuments} openDocument={openSavedDocument} deleteDocument={deleteSavedDocument} startNewDocument={startNewDocument} navigate={navigate} saveStatus={saveStatus} />
      <QuotationWorkspaceModal
        pathname={pathname}
        documentType={documentType}
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
        documentType={documentType}
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
        createShare={createShare}
        shareUrl={activeShareUrl}
        convertToBill={convertCurrentQuotationToBill}
        navigate={navigate}
        businessProfile={businessProfile}
      />
    </>
  );
}

export default App;
