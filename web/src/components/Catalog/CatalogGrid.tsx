import { CatalogItem } from '../../types/catalog';

interface CatalogGridProps {
  items: CatalogItem[];
  onSelectItem: (itemId: string) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
}

export function CatalogGrid({ items, onSelectItem, onDeleteItem }: CatalogGridProps) {
  const formatItemName = (id: string) => 
    id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const getItemDescription = (id: string) => 
    id === 'backup-config' 
      ? 'Archive device configurations to secure storage'
      : `Automated ${id.replace('-', ' ')} service`;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-orange-300 transition-all duration-200 relative group"
          >
            {/* Delete button - only visible on hover */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id, formatItemName(item.id));
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete catalog item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div 
              className="p-6 cursor-pointer"
              onClick={() => onSelectItem(item.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {formatItemName(item.id)}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {getItemDescription(item.id)}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {item.versions.length} version{item.versions.length !== 1 ? 's' : ''}
                </div>
                <div className="text-orange-600 text-sm font-medium">
                  Configure →
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
