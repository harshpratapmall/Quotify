import { useCallback, useState } from 'react';

// Loaded document library state with the upsert/replace/remove mutations the
// save, status, and delete flows need. Keeps App.js from re-declaring the same
// set-state updaters for quotations and bills.
export function useSavedDocuments() {
  const [savedDocuments, setSavedDocuments] = useState({ quotation: [], bill: [] });

  const upsertDocument = useCallback((type, entry) => {
    setSavedDocuments((current) => ({ ...current, [type]: [entry, ...current[type].filter((item) => item.id !== entry.id)] }));
  }, []);

  const replaceDocument = useCallback((type, id, replacement) => {
    setSavedDocuments((current) => ({ ...current, [type]: current[type].map((entry) => entry.id === id ? replacement : entry) }));
  }, []);

  const removeDocument = useCallback((type, id) => {
    setSavedDocuments((current) => ({ ...current, [type]: current[type].filter((entry) => entry.id !== id) }));
  }, []);

  return { savedDocuments, setSavedDocuments, upsertDocument, replaceDocument, removeDocument };
}