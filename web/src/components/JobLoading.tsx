import React from 'react';
import { LoadingState } from '../types/job';

interface JobLoadingProps {
  loadingState: LoadingState;
  retryCount: number;
}

const getLoadingMessage = (loadingState: LoadingState, retryCount: number): string => {
  switch (loadingState) {
    case LoadingState.INITIAL_LOADING:
      return 'Loading job details...';
    case LoadingState.WAITING_FOR_JOB:
      return `Waiting for job to be created... (${retryCount}/10)`;
    case LoadingState.REFRESHING:
      return 'Refreshing job details...';
    default:
      return 'Loading...';
  }
};

const getLoadingDescription = (loadingState: LoadingState): string | null => {
  switch (loadingState) {
    case LoadingState.WAITING_FOR_JOB:
      return 'The job is being initialized in the background. Please wait...';
    case LoadingState.REFRESHING:
      return 'Fetching latest job information...';
    default:
      return null;
  }
};

export const JobLoading: React.FC<JobLoadingProps> = ({
  loadingState,
  retryCount
}) => {
  const message = getLoadingMessage(loadingState, retryCount);
  const description = getLoadingDescription(loadingState);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className="text-gray-600 block">
            {message}
          </span>
          {description && (
            <p className="text-sm text-gray-500 mt-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
