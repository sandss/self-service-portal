import { CatalogGrid } from './CatalogGrid';
import { LoadingSpinner } from './LoadingSpinner';
import { CatalogItem } from '../../types/catalog';

interface CatalogViewProps {
  items: CatalogItem[];
  loading: boolean;
  onSelectItem: (itemId: string) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
}

export function CatalogView({ 
  items, 
  loading, 
  onSelectItem, 
  onDeleteItem 
}: CatalogViewProps) {
  if (loading) {
    return <LoadingSpinner message="Loading catalog items..." />;
  }
  
  return (
    <CatalogGrid
      items={items}
      onSelectItem={onSelectItem}
      onDeleteItem={onDeleteItem}
    />
  );
}
