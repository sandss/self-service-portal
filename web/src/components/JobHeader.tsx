import React from 'react';

interface JobHeaderProps {
  onBackClick: () => void;
  autoRefresh: boolean;
  onRefresh: () => void;
}

export const JobHeader: React.FC<JobHeaderProps> = ({
  onBackClick,
  autoRefresh,
  onRefresh
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onBackClick}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to Jobs
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        {autoRefresh && (
          <span className="text-sm text-gray-500 flex items-center">
            🔄 Auto-refreshing
          </span>
        )}
        <button 
          onClick={onRefresh}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};
