import React from 'react';
import { Skeleton, SkeletonText } from '../../../shared/components/Skeleton';
import { LoadingState } from '../types/job';

interface JobDetailSkeletonProps {
  loadingState: LoadingState;
  retryCount: number;
}

const LoadingMessage: React.FC<{ loadingState: LoadingState; retryCount: number }> = ({ 
  loadingState, 
  retryCount 
}) => {
  const getMessage = () => {
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

  const getDescription = () => {
    switch (loadingState) {
      case LoadingState.WAITING_FOR_JOB:
        return 'The job is being initialized in the background. Please wait...';
      case LoadingState.REFRESHING:
        return 'Fetching latest information...';
      default:
        return null;
    }
  };

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-2 mb-2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <p className="text-gray-600 font-medium">{getMessage()}</p>
      {getDescription() && (
        <p className="text-sm text-gray-500 mt-1">{getDescription()}</p>
      )}
    </div>
  );
};

export const JobDetailSkeleton: React.FC<JobDetailSkeletonProps> = ({ 
  loadingState, 
  retryCount 
}) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <LoadingMessage loadingState={loadingState} retryCount={retryCount} />
      
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Skeleton width="w-24" height="h-6" />
          <Skeleton width="w-32" height="h-8" />
        </div>
        <div className="flex items-center space-x-3">
          <Skeleton width="w-20" height="h-5" />
          <Skeleton width="w-16" height="h-8" />
        </div>
      </div>

      {/* Job Summary Card Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton width="w-16" height="h-4" className="mb-2" />
              <Skeleton width="w-full" height="h-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Progress Section Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <Skeleton width="w-20" height="h-6" className="mb-4" />
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Skeleton width="w-32" height="h-4" />
              <Skeleton width="w-12" height="h-4" />
            </div>
            <Skeleton width="w-full" height="h-3" rounded />
          </div>
        </div>
      </div>

      {/* Timeline Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <Skeleton width="w-20" height="h-6" className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton width="w-24" height="h-4" />
              <Skeleton width="w-40" height="h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Data Sections Skeleton */}
      <div className="space-y-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <Skeleton width="w-32" height="h-5" className="mb-2" />
            <SkeletonText lines={4} />
          </div>
        ))}
      </div>
    </div>
  );
};
