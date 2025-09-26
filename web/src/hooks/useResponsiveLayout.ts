import { useState, useEffect } from 'react';

interface UseResponsiveLayoutReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  sidebarShouldAutoHide: boolean;
}

export function useResponsiveLayout(): UseResponsiveLayoutReturn {
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    // Initialize screen width
    setScreenWidth(window.innerWidth);

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;
  
  // Auto-hide sidebar on mobile and tablet
  const sidebarShouldAutoHide = screenWidth < 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    sidebarShouldAutoHide,
  };
}
