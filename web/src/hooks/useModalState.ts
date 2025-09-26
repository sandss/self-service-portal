import { useState } from 'react';

export function useModalState() {
  const [showImport, setShowImport] = useState(false);
  
  const openImport = () => setShowImport(true);
  const closeImport = () => setShowImport(false);
  
  return { 
    showImport, 
    openImport, 
    closeImport,
    // For future modal extensions
    setShowImport 
  };
}
