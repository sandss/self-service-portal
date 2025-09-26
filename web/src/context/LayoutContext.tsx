import React, { createContext, useContext, ReactNode } from 'react';
import { useLayout } from '../hooks/useLayout';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface LayoutContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  sidebarShouldAutoHide: boolean;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const layoutState = useLayout();
  const responsiveState = useResponsiveLayout();

  const value: LayoutContextValue = {
    ...layoutState,
    ...responsiveState,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
