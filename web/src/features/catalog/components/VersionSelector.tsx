import React from 'react';

type Item = { id: string; versions: string[]; latest?: string };

interface VersionSelectorProps {
  selectedItemId: string;
  items: Item[];
  onSelectVersion: (version: string) => void;
  onDeleteVersion: (itemId: string, version: string, itemName: string) => void;
  onBack: () => void;
}

export function VersionSelector({ 
  selectedItemId, 
  items, 
  onSelectVersion, 
  onDeleteVersion, 
  onBack 
}: VersionSelectorProps) {
  const selectedItem = items.find(i => i.id === selectedItemId);
  
  if (!selectedItem) return null;

  const formatItemName = (id: string) => 
    id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Catalog
      </button>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Version</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedItem.versions.map(version => (
            <div
              key={version}
              className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 hover:bg-orange-50 transition-all relative group"
            >
              {/* Delete version button - only visible on hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedItem.versions.length > 1) {
                      onDeleteVersion(selectedItemId, version, formatItemName(selectedItemId));
                    } else {
                      console.error("Cannot delete the last version of a catalog item. Delete the entire item instead.");
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete this version"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div 
                className="cursor-pointer"
                onClick={() => onSelectVersion(version)}
              >
                <div className="font-medium text-gray-900">Version {version}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {version === "1.0.0" ? "Stable release" : "Latest version"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
