import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

interface JobDetail {
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

interface UseJobDetailReturn {
  job: JobDetail | null;
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
  retryCount: number;
  isWaitingForJob: boolean;
  fetchJobDetail: (isInitialLoad?: boolean) => Promise<void>;
  setAutoRefresh: (value: boolean) => void;
}

export const useJobDetail = (jobId: string | undefined): UseJobDetailReturn => {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isWaitingForJob, setIsWaitingForJob] = useState(true);

  const fetchJobDetail = useCallback(async (isInitialLoad = false) => {
    if (!jobId) return;
    
    console.log(`Fetching job detail for ID: ${jobId}`);
    console.log(`API URL: ${API_BASE_URL}/jobs/${jobId}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const jobData = await response.json();
        console.log('Job data received:', jobData);
        console.log('Setting job state and clearing loading...');
        setJob(jobData);
        setIsWaitingForJob(false);
        setError(null);
        setLoading(false);
        console.log('Job state updated, loading should be false now');
        
        // Stop auto-refresh if job is complete
        if (jobData.state === 'SUCCEEDED' || jobData.state === 'FAILED') {
          setAutoRefresh(false);
          console.log('Auto-refresh disabled for completed job');
        }
      } else if (response.status === 404 && isInitialLoad && retryCount < 10) {
        // Job not found yet - this is expected for newly created jobs
        // Wait and retry up to 10 times (20 seconds total)
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchJobDetail(true), 2000);
        return; // Don't set loading to false yet
      } else {
        console.log(`Error response: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        setError(`Failed to fetch job details: ${response.status}`);
        setIsWaitingForJob(false);
      }
    } catch (err) {
      console.log('Fetch error:', err);
      if (isInitialLoad && retryCount < 10) {
        // Network error during initial load - retry
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchJobDetail(true), 2000);
        return;
      }
      setError(`Error fetching job: ${err}`);
      setIsWaitingForJob(false);
    } finally {
      // Always set loading to false unless we're in the middle of retrying
      if (!isInitialLoad || retryCount >= 10 || !isWaitingForJob) {
        console.log('Setting loading to false in finally block');
        setLoading(false);
      }
    }
  }, [jobId, retryCount, isWaitingForJob]);

  useEffect(() => {
    console.log('useEffect triggered, calling fetchJobDetail with jobId:', jobId);
    fetchJobDetail(true); // Initial load with retry logic
  }, [jobId, fetchJobDetail]);

  // Auto-refresh for running jobs (but not during initial waiting period)
  useEffect(() => {
    if (!autoRefresh || isWaitingForJob) return;

    const interval = setInterval(() => fetchJobDetail(false), 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, jobId, isWaitingForJob, fetchJobDetail]);

  return {
    job,
    loading,
    error,
    autoRefresh,
    retryCount,
    isWaitingForJob,
    fetchJobDetail,
    setAutoRefresh
  };
};
