import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className = '' }: MainContentProps) {
  return (
    <main className={`flex-1 overflow-y-auto p-6 ${className}`}>
      {children}
    </main>
  );
}
