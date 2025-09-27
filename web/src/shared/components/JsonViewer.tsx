import React, { useState } from 'react';
import { CopyButton } from './CopyButton';
import { formatJsonForCopy } from '../utils/clipboardUtils';

interface JsonViewerProps {
  data: any;
  title: string;
  isError?: boolean;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  isError = false,
  defaultExpanded = false,
  maxHeight = '400px'
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState('');

  if (!data) return null;

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const copyText = formatJsonForCopy(data);
  
  // Simple search highlighting
  const highlightedJson = searchTerm 
    ? jsonString.replace(
        new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<mark class="bg-yellow-200">$1</mark>'
      )
    : jsonString;

  const bgColor = isError ? 'bg-red-50' : 'bg-gray-50';
  const borderColor = isError ? 'border-red-200' : 'border-gray-200';
  const textColor = isError ? 'text-red-700' : 'text-gray-700';
  const titleColor = isError ? 'text-red-900' : 'text-gray-900';
  const icon = isError ? '❌' : '📄';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg mb-6 overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h4 className={`font-medium ${titleColor} flex items-center`}>
              <span className="mr-2">{icon}</span>
              {title}
            </h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {typeof data === 'string' ? `${data.length} chars` : `${Object.keys(data).length} keys`}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {isExpanded && jsonString.length > 200 && (
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
            <CopyButton text={copyText} />
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          <div 
            className={`overflow-auto ${maxHeight ? `max-h-[${maxHeight}]` : ''}`}
            style={{ maxHeight }}
          >
            <pre 
              className={`text-sm ${textColor} whitespace-pre-wrap font-mono leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: highlightedJson }}
            />
          </div>
          
          {jsonString.length > 1000 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Large content detected. Use search to find specific values.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {!isExpanded && (
        <div className="p-4">
          <div className="text-sm text-gray-500 italic">
            Click to expand and view {typeof data === 'object' ? 'JSON data' : 'content'}
            {jsonString.length > 100 && (
              <span className="ml-2">({jsonString.length} characters)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
