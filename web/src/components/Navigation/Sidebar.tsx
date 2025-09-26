import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navigationItems } from '../../config/navigation';
import { CatalogIcon, JobsIcon } from '../icons/NavigationIcons';

// Icon mapping for navigation items
const iconMap = {
  catalog: CatalogIcon,
  jobs: JobsIcon,
};

function NavigationItem({ item }: { item: typeof navigationItems[0] }) {
  const location = useLocation();
  const IconComponent = iconMap[item.iconName as keyof typeof iconMap];
  const isActive = location.pathname === item.path;

  return (
    <li>
      <Link
        to={item.path}
        className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <span className={isActive ? 'text-orange-700' : 'text-gray-400'}>
          {IconComponent && <IconComponent />}
        </span>
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

function AppLogo() {
  return (
    <div className="p-6">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Self Service</h1>
          <p className="text-xs text-gray-500">Portal</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 h-full">
      <AppLogo />
      
      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <NavigationItem key={item.id} item={item} />
          ))}
        </ul>
      </nav>
    </div>
  );
}
