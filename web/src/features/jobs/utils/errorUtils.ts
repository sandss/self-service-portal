import { JobError, ErrorType } from '../types/job';

export const createJobError = (
  type: ErrorType,
  message: string,
  statusCode?: number
): JobError => {
  const retryable = determineRetryability(type, statusCode);
  
  return {
    type,
    message,
    statusCode,
    retryable
  };
};

const determineRetryability = (type: ErrorType, statusCode?: number): boolean => {
  switch (type) {
    case ErrorType.NETWORK:
      return true;
    case ErrorType.NOT_FOUND:
      return true; // Job might not be created yet
    case ErrorType.TIMEOUT:
      return true;
    case ErrorType.SERVER:
      return statusCode ? statusCode >= 500 : false;
    case ErrorType.UNKNOWN:
      return false;
    default:
      return false;
  }
};

export const parseResponseError = async (response: Response): Promise<JobError> => {
  const statusCode = response.status;
  
  try {
    // We could parse error details from response body in the future
    await response.text(); // Consume the body
    
    switch (statusCode) {
      case 404:
        return createJobError(
          ErrorType.NOT_FOUND,
          'Job not found - it may still be initializing',
          statusCode
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return createJobError(
          ErrorType.SERVER,
          `Server error: ${response.statusText}`,
          statusCode
        );
      default:
        return createJobError(
          ErrorType.SERVER,
          `Failed to fetch job details: ${statusCode} ${response.statusText}`,
          statusCode
        );
    }
  } catch (parseError) {
    return createJobError(
      ErrorType.SERVER,
      `Server error: ${response.statusText}`,
      statusCode
    );
  }
};

export const parseNetworkError = (error: Error): JobError => {
  if (error.name === 'AbortError') {
    return createJobError(ErrorType.TIMEOUT, 'Request was cancelled');
  }
  
  if (error.message.includes('fetch')) {
    return createJobError(ErrorType.NETWORK, 'Network connection failed');
  }
  
  return createJobError(ErrorType.UNKNOWN, `Unexpected error: ${error.message}`);
};

export const getErrorMessage = (error: JobError): string => {
  switch (error.type) {
    case ErrorType.NOT_FOUND:
      return 'Job not found. It may still be initializing...';
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection.';
    case ErrorType.SERVER:
      return `Server error (${error.statusCode || 'Unknown'}). Please try again.`;
    case ErrorType.TIMEOUT:
      return 'Request timed out. Please try again.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
};
