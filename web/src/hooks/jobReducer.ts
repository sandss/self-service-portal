import { JobDetail, JobState_Combined, LoadingState, JobError } from '../types/job';

export type JobAction =
  | { type: 'FETCH_START'; isInitialLoad: boolean }
  | { type: 'FETCH_SUCCESS'; job: JobDetail }
  | { type: 'FETCH_ERROR'; error: JobError; canRetry: boolean }
  | { type: 'RETRY_INCREMENT' }
  | { type: 'RETRY_RESET' }
  | { type: 'SET_AUTO_REFRESH'; autoRefresh: boolean }
  | { type: 'RESET' };

export const initialJobState: JobState_Combined = {
  job: null,
  loadingState: LoadingState.IDLE,
  error: null,
  retryCount: 0,
  autoRefresh: true
};

export const jobReducer = (state: JobState_Combined, action: JobAction): JobState_Combined => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loadingState: action.isInitialLoad 
          ? (state.retryCount > 0 ? LoadingState.WAITING_FOR_JOB : LoadingState.INITIAL_LOADING)
          : LoadingState.REFRESHING,
        error: null
      };

    case 'FETCH_SUCCESS':
      const isCompleted = ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(action.job.state);
      
      return {
        ...state,
        job: action.job,
        loadingState: LoadingState.LOADED,
        error: null,
        retryCount: 0,
        autoRefresh: isCompleted ? false : state.autoRefresh
      };

    case 'FETCH_ERROR':
      return {
        ...state,
        loadingState: action.canRetry ? state.loadingState : LoadingState.LOADED,
        error: action.error
      };

    case 'RETRY_INCREMENT':
      return {
        ...state,
        retryCount: state.retryCount + 1,
        loadingState: LoadingState.WAITING_FOR_JOB
      };

    case 'RETRY_RESET':
      return {
        ...state,
        retryCount: 0
      };

    case 'SET_AUTO_REFRESH':
      return {
        ...state,
        autoRefresh: action.autoRefresh
      };

    case 'RESET':
      return initialJobState;

    default:
      return state;
  }
};
