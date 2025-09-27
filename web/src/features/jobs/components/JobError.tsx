import React from 'react';
import { JobError as JobErrorType, ErrorType } from '../types/job';
import { getErrorMessage } from '../utils/errorUtils';

interface JobErrorProps {
  error: string | JobErrorType | null;
  onBackClick: () => void;
  onRetry?: () => void;
}

const getErrorIcon = (errorType?: ErrorType): string => {
  switch (errorType) {
    case ErrorType.NETWORK:
      return '🌐';
    case ErrorType.NOT_FOUND:
      return '🔍';
    case ErrorType.SERVER:
      return '🚨';
    case ErrorType.TIMEOUT:
      return '⏱️';
    default:
      return '❌';
  }
};

const getErrorTitle = (errorType?: ErrorType): string => {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Connection Error';
    case ErrorType.NOT_FOUND:
      return 'Job Not Found';
    case ErrorType.SERVER:
      return 'Server Error';
    case ErrorType.TIMEOUT:
      return 'Request Timeout';
    default:
      return 'Error Loading Job';
  }
};

export const JobError: React.FC<JobErrorProps> = ({ error, onBackClick, onRetry }) => {
  if (!error) return null;
  
  // Handle both string errors (backward compatibility) and structured errors
  const errorObj = typeof error === 'string' ? null : error;
  const errorMessage = typeof error === 'string' ? error : getErrorMessage(error);
  const errorType = errorObj?.type;
  const isRetryable = errorObj?.retryable || false;
  
  const icon = getErrorIcon(errorType);
  const title = getErrorTitle(errorType);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-800 mb-2">{title}</h2>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            
            {errorObj?.statusCode && (
              <p className="text-sm text-red-500 mb-4">
                Status Code: {errorObj.statusCode}
              </p>
            )}
            
            <div className="flex space-x-3">
              <button 
                onClick={onBackClick}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                ← Back to Jobs
              </button>
              
              {isRetryable && onRetry && (
                <button 
                  onClick={onRetry}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
