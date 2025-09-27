import React from 'react';
import { LoadingState } from '../types/job';
import { JobDetailSkeleton } from './JobDetailSkeleton';

interface JobLoadingProps {
  loadingState: LoadingState;
  retryCount: number;
}

export const JobLoading: React.FC<JobLoadingProps> = ({
  loadingState,
  retryCount
}) => {
  // For refreshing state, show skeleton with existing layout
  if (loadingState === LoadingState.REFRESHING) {
    return <JobDetailSkeleton loadingState={loadingState} retryCount={retryCount} />;
  }

  // For initial loading and waiting states, show the enhanced skeleton
  return <JobDetailSkeleton loadingState={loadingState} retryCount={retryCount} />;
};
