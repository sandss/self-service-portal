import React from 'react';

interface JobLoadingProps {
  isWaitingForJob: boolean;
  retryCount: number;
}

export const JobLoading: React.FC<JobLoadingProps> = ({
  isWaitingForJob,
  retryCount
}) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className="text-gray-600 block">
            {isWaitingForJob 
              ? `Waiting for job to be created... (${retryCount}/10)` 
              : 'Loading job details...'}
          </span>
          {isWaitingForJob && (
            <p className="text-sm text-gray-500 mt-2">
              The job is being initialized in the background. Please wait...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
