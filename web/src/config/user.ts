export interface User {
  name: string;
  email: string;
  initials: string;
  avatar?: string;
}

export interface UserMenuItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  isDivider?: boolean;
}

export const currentUser: User = {
  name: 'John Doe',
  email: 'john.doe@company.com',
  initials: 'JD',
};

export const userMenuItems: UserMenuItem[] = [
  {
    id: 'profile',
    label: 'View Profile',
    href: '#',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '#',
  },
  {
    id: 'billing',
    label: 'Billing',
    href: '#',
  },
  {
    id: 'divider',
    label: '',
    isDivider: true,
  },
  {
    id: 'signout',
    label: 'Sign Out',
    // onClick will be handled by the UserMenu component using the hook
  },
];
