import { CatalogView } from './CatalogView';
import { VersionView } from './VersionView';
import { FormView } from './FormView';
import { CatalogView as CatalogViewType, CatalogItem, CatalogDescriptor } from '../../../types/catalog';

interface CatalogViewRouterProps {
  currentView: CatalogViewType;
  items: CatalogItem[];
  selected: string | null;
  version: string | null;
  descriptor: CatalogDescriptor | null;
  loading: boolean;
  isCreatingJob: boolean;
  result: { job_id: string } | null;
  onSelectItem: (itemId: string) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  onSelectVersion: (version: string) => void;
  onDeleteVersion: (itemId: string, version: string, itemName: string) => void;
  onSubmit: (data: any) => Promise<void>;
  onBack: () => void;
}

export function CatalogViewRouter({ 
  currentView,
  items,
  selected,
  version,
  descriptor,
  loading,
  isCreatingJob,
  result,
  onSelectItem,
  onDeleteItem,
  onSelectVersion,
  onDeleteVersion,
  onSubmit,
  onBack
}: CatalogViewRouterProps) {
  switch (currentView) {
    case 'catalog':
      return (
        <CatalogView
          items={items}
          loading={loading}
          onSelectItem={onSelectItem}
          onDeleteItem={onDeleteItem}
        />
      );
      
    case 'versions':
      return selected ? (
        <VersionView
          selectedItemId={selected}
          items={items}
          onSelectVersion={onSelectVersion}
          onDeleteVersion={onDeleteVersion}
          onBack={onBack}
        />
      ) : null;
      
    case 'form':
      return descriptor && selected && version ? (
        <FormView
          selected={selected}
          version={version}
          descriptor={descriptor}
          isCreatingJob={isCreatingJob}
          result={result}
          loading={loading}
          onSubmit={onSubmit}
          onBack={onBack}
        />
      ) : null;
      
    default:
      return (
        <CatalogView
          items={items}
          loading={loading}
          onSelectItem={onSelectItem}
          onDeleteItem={onDeleteItem}
        />
      );
  }
}
