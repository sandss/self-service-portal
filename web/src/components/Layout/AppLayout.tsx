import React from 'react';
import { Sidebar } from '../Navigation';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface ContentAreaProps {
  children: React.ReactNode;
}

function ContentArea({ children }: ContentAreaProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <MainContent>
        {children}
      </MainContent>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isMobile } = useResponsiveLayout();

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Hide sidebar on mobile, show on desktop */}
      {!isMobile && <Sidebar />}
      <ContentArea>
        {children}
      </ContentArea>
    </div>
  );
}
