export type CatalogView = 'catalog' | 'versions' | 'form';

export interface CatalogItem {
  id: string;
  versions: string[];
  latest?: string;
}

export interface CatalogDescriptor {
  schema: any;
  ui?: any;
  manifest?: {
    name?: string;
    description?: string;
  };
}

export interface DeleteDialogState {
  isOpen: boolean;
  isLoading: boolean;
  itemId: string | null;
  version: string | null;
  itemName: string;
}

export interface CatalogState {
  view: CatalogView;
  selected: string | null;
  version: string | null;
  descriptor: CatalogDescriptor | null;
}
