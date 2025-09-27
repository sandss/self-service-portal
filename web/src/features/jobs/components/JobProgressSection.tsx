import React from 'react';

interface JobProgressSectionProps {
  state: string;
  progress?: number;
  currentStep?: string;
}

const ProgressBar: React.FC<{ progress: number; state: string }> = ({ progress, state }) => {
  const getProgressColor = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return 'bg-blue-600';
      case 'SUCCEEDED':
        return 'bg-green-600';
      case 'FAILED':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const isAnimated = state === 'RUNNING';

  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div 
        className={`h-3 rounded-full transition-all duration-500 ease-out relative ${getProgressColor(state)} ${
          isAnimated ? 'animate-pulse' : ''
        }`}
        style={{ width: `${Math.max(progress, 2)}%` }}
      >
        {isAnimated && (
          <div className="absolute inset-0 bg-white opacity-30 animate-ping rounded-full"></div>
        )}
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{ step: string; state: string }> = ({ step, state }) => {
  const getStepIcon = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return '⚡';
      case 'SUCCEEDED':
        return '✅';
      case 'FAILED':
        return '❌';
      default:
        return '🔄';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-lg">{getStepIcon(state)}</span>
      <span className="text-sm font-medium text-gray-700">{step}</span>
    </div>
  );
};

export const JobProgressSection: React.FC<JobProgressSectionProps> = ({
  state,
  progress,
  currentStep
}) => {
  // Show progress section for running jobs or when progress is available
  if (state !== 'RUNNING' && progress === undefined) {
    return null;
  }

  const progressValue = progress || 0;
  const stepText = currentStep || 'Processing...';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">📊</span>
          Progress
        </h3>
        {state === 'RUNNING' && (
          <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-1"></div>
            In Progress
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-3">
            <StepIndicator step={stepText} state={state} />
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">
                {Math.round(progressValue)}%
              </span>
              <div className="text-xs text-gray-500">
                {progressValue < 100 ? 'Completing...' : 'Done'}
              </div>
            </div>
          </div>
          <ProgressBar progress={progressValue} state={state} />
        </div>

        {/* Progress milestones */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};
