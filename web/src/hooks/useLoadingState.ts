import { useState } from 'react';

export function useLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };
  
  const isLoading = (key: string) => loadingStates[key] || false;
  
  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  
  const getLoadingKeys = () => Object.keys(loadingStates).filter(key => loadingStates[key]);
  
  const clearLoading = () => setLoadingStates({});
  
  return { 
    setLoading, 
    isLoading, 
    isAnyLoading, 
    getLoadingKeys,
    clearLoading,
    loadingStates 
  };
}
