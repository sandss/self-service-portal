import { useState, useCallback } from 'react';

interface UseLayoutReturn {
  refreshKey: number;
  triggerRefresh: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export function useLayout(): UseLayoutReturn {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  return {
    refreshKey,
    triggerRefresh,
    isSidebarCollapsed,
    toggleSidebar,
  };
}
