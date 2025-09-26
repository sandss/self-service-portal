import React from 'react';
import { useLocation } from 'react-router-dom';
import { UserMenu } from '../User';
import { getPageConfig } from '../../config/pages';

interface HeaderProps {
  className?: string;
}

function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

export function Header({ className = '' }: HeaderProps) {
  const location = useLocation();
  const { title, description } = getPageConfig(location.pathname);

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <PageTitle title={title} description={description} />
        <UserMenu />
      </div>
    </header>
  );
}
