export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
}

export const navigationItems: NavigationItem[] = [
  { 
    id: 'self-service', 
    label: 'Catalog', 
    path: '/self-service', 
    iconName: 'catalog'
  },
  { 
    id: 'dashboard', 
    label: 'Jobs', 
    path: '/', 
    iconName: 'jobs'
  }
];
