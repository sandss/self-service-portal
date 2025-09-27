import { CatalogView } from '../../../types/catalog';

export function useCatalogNavigation(selected: string | null, descriptor: any) {
  const getCurrentView = (): CatalogView => {
    if (!selected) return 'catalog';
    if (!descriptor) return 'versions';
    return 'form';
  };
  
  const currentView = getCurrentView();
  
  return { 
    currentView,
    isOnCatalog: currentView === 'catalog',
    isOnVersions: currentView === 'versions', 
    isOnForm: currentView === 'form'
  };
}
