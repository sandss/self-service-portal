export const POLLING_CONFIG = {
  // Base polling interval in milliseconds
  BASE_INTERVAL: 2000,
  
  // Maximum retry count for initial job creation
  MAX_INITIAL_RETRIES: 10,
  
  // Retry delay for failed requests
  RETRY_DELAY: 2000,
  
  // Exponential backoff multiplier
  BACKOFF_MULTIPLIER: 1.5,
  
  // Maximum polling interval (30 seconds)
  MAX_INTERVAL: 30000,
  
  // Interval for different job states
  INTERVALS: {
    'QUEUED': 3000,
    'RUNNING': 2000,
    'SUCCEEDED': 0, // No polling needed
    'FAILED': 0,    // No polling needed
    'CANCELLED': 0  // No polling needed
  } as const
} as const;

export const JOB_CONFIG = {
  COMPLETED_STATES: ['SUCCEEDED', 'FAILED', 'CANCELLED'] as const,
  ACTIVE_STATES: ['QUEUED', 'RUNNING'] as const
} as const;
