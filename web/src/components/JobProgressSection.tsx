import React from 'react';

interface JobProgressSectionProps {
  state: string;
  progress?: number;
  currentStep?: string;
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div 
        className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export const JobProgressSection: React.FC<JobProgressSectionProps> = ({
  state,
  progress,
  currentStep
}) => {
  // Only show progress section for running jobs or when progress is available
  if (state !== 'RUNNING' && progress === undefined) {
    return null;
  }

  const progressValue = progress || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {currentStep || 'Processing...'}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressValue)}%
            </span>
          </div>
          <ProgressBar progress={progressValue} />
        </div>
      </div>
    </div>
  );
};
