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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onBackClick}
          className="
            flex items-center space-x-1 text-blue-600 hover:text-blue-800 
            transition-colors duration-200 group focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1
          "
          aria-label="Go back to jobs list"
        >
          <svg 
            className="w-4 h-4 transform transition-transform group-hover:-translate-x-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Jobs</span>
        </button>
        
        <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
        
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-2">📋</span>
          Job Details
        </h1>
      </div>
      
      <div className="flex items-center space-x-3">
        {autoRefresh && (
          <div className="hidden sm:flex items-center text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            Auto-refreshing
          </div>
        )}
        
        <button 
          onClick={onRefresh}
          className="
            inline-flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 
            rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none 
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all 
            duration-200 transform hover:scale-105 active:scale-95
          "
          aria-label="Refresh job details"
        >
          <svg 
            className="w-4 h-4 transition-transform hover:rotate-180" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
};
