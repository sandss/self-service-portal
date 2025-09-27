import { VersionSelector } from './VersionSelector';
import { CatalogItem } from '../../../types/catalog';

interface VersionViewProps {
  selectedItemId: string;
  items: CatalogItem[];
  onSelectVersion: (version: string) => void;
  onDeleteVersion: (itemId: string, version: string, itemName: string) => void;
  onBack: () => void;
}

export function VersionView({ 
  selectedItemId, 
  items, 
  onSelectVersion, 
  onDeleteVersion, 
  onBack 
}: VersionViewProps) {
  return (
    <VersionSelector
      selectedItemId={selectedItemId}
      items={items}
      onSelectVersion={onSelectVersion}
      onDeleteVersion={onDeleteVersion}
      onBack={onBack}
    />
  );
}
