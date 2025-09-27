export interface JobDetail {
  id: string;
  state: string;
  progress?: number;
  current_step?: string;
  type?: string;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  updated_at?: string;
  params?: any;
  result?: any;
  error?: any;
}

export enum JobState {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum LoadingState {
  IDLE = 'IDLE',
  INITIAL_LOADING = 'INITIAL_LOADING',
  WAITING_FOR_JOB = 'WAITING_FOR_JOB',
  REFRESHING = 'REFRESHING',
  LOADED = 'LOADED'
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface JobError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export interface JobState_Combined {
  job: JobDetail | null;
  loadingState: LoadingState;
  error: JobError | null;
  retryCount: number;
  autoRefresh: boolean;
}
