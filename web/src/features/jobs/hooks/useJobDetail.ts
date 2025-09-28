import { useReducer, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../../api';
import { JobDetail, LoadingState } from '../types/job';
import { jobReducer, initialJobState } from './jobReducer';
import { parseResponseError, parseNetworkError } from '../utils/errorUtils';
import { POLLING_CONFIG } from '../constants/jobConstants';

interface UseJobDetailReturn {
  job: JobDetail | null;
  loadingState: LoadingState;
  error: any; // Keep as any for backward compatibility
  autoRefresh: boolean;
  retryCount: number;
  // Computed properties for backward compatibility
  loading: boolean;
  isWaitingForJob: boolean;
  fetchJobDetail: (isInitialLoad?: boolean) => Promise<void>;
  setAutoRefresh: (value: boolean) => void;
}

export const useJobDetail = (jobId: string | undefined): UseJobDetailReturn => {
  const [state, dispatch] = useReducer(jobReducer, initialJobState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJobDetail = useCallback(async (isInitialLoad = false) => {
    if (!jobId) return;
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    dispatch({ type: 'FETCH_START', isInitialLoad });
    
    console.log(`Fetching job detail for ID: ${jobId}`);
    console.log(`API URL: ${API_BASE_URL}/jobs/${jobId}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        signal: abortControllerRef.current.signal
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const jobData = await response.json();
        console.log('Job data received:', jobData);
        dispatch({ type: 'FETCH_SUCCESS', job: jobData });
      } else {
        const error = await parseResponseError(response);
        
        // Handle retry logic for initial load
        if (isInitialLoad && error.retryable && state.retryCount < POLLING_CONFIG.MAX_INITIAL_RETRIES) {
          console.log(`Retrying in ${POLLING_CONFIG.RETRY_DELAY}ms... (${state.retryCount + 1}/${POLLING_CONFIG.MAX_INITIAL_RETRIES})`);
          dispatch({ type: 'RETRY_INCREMENT' });
          
          timeoutRef.current = setTimeout(() => {
            fetchJobDetail(true);
          }, POLLING_CONFIG.RETRY_DELAY);
          return;
        }
        
        dispatch({ type: 'FETCH_ERROR', error, canRetry: false });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      
      const error = parseNetworkError(err as Error);
      
      // Handle retry logic for initial load
      if (isInitialLoad && error.retryable && state.retryCount < POLLING_CONFIG.MAX_INITIAL_RETRIES) {
        console.log(`Network error, retrying in ${POLLING_CONFIG.RETRY_DELAY}ms... (${state.retryCount + 1}/${POLLING_CONFIG.MAX_INITIAL_RETRIES})`);
        dispatch({ type: 'RETRY_INCREMENT' });
        
        timeoutRef.current = setTimeout(() => {
          fetchJobDetail(true);
        }, POLLING_CONFIG.RETRY_DELAY);
        return;
      }
      
      dispatch({ type: 'FETCH_ERROR', error, canRetry: false });
    }
  }, [jobId, state.retryCount]);

  const setAutoRefresh = useCallback((value: boolean) => {
    dispatch({ type: 'SET_AUTO_REFRESH', autoRefresh: value });
  }, []);

  // Initial fetch
  useEffect(() => {
    if (jobId) {
      console.log('useEffect triggered, calling fetchJobDetail with jobId:', jobId);
      fetchJobDetail(true);
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [jobId]);

  // Auto-refresh polling
  useEffect(() => {
    if (!state.autoRefresh || state.loadingState === LoadingState.WAITING_FOR_JOB || !state.job) {
      return;
    }

    // Get polling interval based on job state - default to base interval for unknown states
    let interval: number = POLLING_CONFIG.BASE_INTERVAL;
    
    if (state.job.state === 'QUEUED') {
      interval = 3000;
    } else if (state.job.state === 'RUNNING') {
      interval = 2000;
    } else if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(state.job.state)) {
      // No polling needed for completed jobs
      return;
    }

    console.log(`Setting up auto-refresh with ${interval}ms interval for state: ${state.job.state}`);
    const intervalId = setInterval(() => fetchJobDetail(false), interval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [state.autoRefresh, state.loadingState, state.job?.state, fetchJobDetail]);

  // Backward compatibility computed properties
  const loading = [LoadingState.INITIAL_LOADING, LoadingState.WAITING_FOR_JOB].includes(state.loadingState);
  const isWaitingForJob = state.loadingState === LoadingState.WAITING_FOR_JOB;

  return {
    job: state.job,
    loadingState: state.loadingState,
    error: state.error?.message || null, // Convert back to string for backward compatibility
    autoRefresh: state.autoRefresh,
    retryCount: state.retryCount,
    // Computed properties for backward compatibility
    loading,
    isWaitingForJob,
    fetchJobDetail,
    setAutoRefresh
  };
};
