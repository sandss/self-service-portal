import React from 'react';

interface JobErrorProps {
  error: string | null;
  onBackClick: () => void;
}

export const JobError: React.FC<JobErrorProps> = ({ error, onBackClick }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Job</h2>
        <p className="text-red-600">{error || 'Job not found'}</p>
        <button 
          onClick={onBackClick}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          ← Back to Jobs
        </button>
      </div>
    </div>
  );
};
