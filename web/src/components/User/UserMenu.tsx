import React from 'react';
import { userMenuItems } from '../../config/user';
import { UserProfile } from './UserProfile';
import { useUser } from '../../hooks/useUser';

interface UserMenuProps {
  className?: string;
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function UserMenuDropdown({ isOpen, onSignOut }: { isOpen: boolean; onSignOut: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
      {userMenuItems.map((item) => {
        if (item.isDivider) {
          return <hr key={item.id} className="my-1" />;
        }

        const handleClick = item.id === 'signout' ? onSignOut : item.onClick;

        return (
          <a
            key={item.id}
            href={item.href || '#'}
            onClick={handleClick}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

export function UserMenu({ className = '' }: UserMenuProps) {
  const { user, isMenuOpen, toggleMenu, closeMenu, signOut } = useUser();

  const handleBlur = () => {
    // Small delay to allow for click events to process
    setTimeout(() => closeMenu(), 150);
  };

  return (
    <div className={`relative ${className}`} onBlur={handleBlur} tabIndex={-1}>
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        <UserProfile user={user} />
        <ChevronDownIcon />
      </button>

      <UserMenuDropdown isOpen={isMenuOpen} onSignOut={signOut} />
    </div>
  );
}
