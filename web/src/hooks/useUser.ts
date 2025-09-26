import { useState, useCallback } from 'react';
import { User, currentUser } from '../config/user';

interface UseUserReturn {
  user: User;
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  signOut: () => void;
}

export function useUser(): UseUserReturn {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const signOut = useCallback(() => {
    // TODO: Implement actual sign out logic
    console.log('Signing out user:', currentUser.name);
    closeMenu();
    // Could dispatch an action or call an API here
  }, [closeMenu]);

  return {
    user: currentUser,
    isMenuOpen,
    toggleMenu,
    closeMenu,
    signOut,
  };
}
