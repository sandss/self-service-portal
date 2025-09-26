import { BUTTON_CLASSES } from '../../constants/catalog';

interface CatalogHeaderProps {
  onImport: () => void;
}

export function CatalogHeader({ onImport }: CatalogHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Catalog</h1>
          <p className="text-gray-600 mt-2">Choose from available automation tasks and services</p>
        </div>
        <button
          onClick={onImport}
          className={BUTTON_CLASSES.primary}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Import Catalog Item
        </button>
      </div>
    </div>
  );
}
