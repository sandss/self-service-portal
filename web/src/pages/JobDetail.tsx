import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const JobDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isWaitingForJob, setIsWaitingForJob] = useState(true);

  console.log('JobDetail component mounted, jobId:', jobId);

  const fetchJobDetail = async (isInitialLoad = false) => {
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
        setLoading(false); // Explicitly set loading to false when we have data
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
  };

  useEffect(() => {
    console.log('useEffect triggered, calling fetchJobDetail with jobId:', jobId);
    fetchJobDetail(true); // Initial load with retry logic
  }, [jobId]);

  // Auto-refresh for running jobs (but not during initial waiting period)
  useEffect(() => {
    if (!autoRefresh || isWaitingForJob) return;

    const interval = setInterval(() => fetchJobDetail(false), 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, jobId, isWaitingForJob]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'SUCCEEDED': return 'text-green-600 bg-green-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      case 'RUNNING': return 'text-blue-600 bg-blue-100';
      case 'QUEUED': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'SUCCEEDED': return '✅';
      case 'FAILED': return '❌';
      case 'RUNNING': return '🔄';
      case 'QUEUED': return '⏳';
      default: return '❓';
    }
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const renderProgressBar = (progress?: number) => {
    const progressValue = progress || 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressValue}%` }}
        />
      </div>
    );
  };

  const renderJsonData = (data: any, title: string) => {
    if (!data) return null;
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
        <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  console.log('Render state - loading:', loading, 'error:', error, 'job:', job ? 'present' : 'null');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <span className="text-gray-600 block">
              {isWaitingForJob 
                ? `Waiting for job to be created... (${retryCount}/10)` 
                : 'Loading job details...'}
            </span>
            {isWaitingForJob && (
              <p className="text-sm text-gray-500 mt-2">
                The job is being initialized in the background. Please wait...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Job</h2>
          <p className="text-red-600">{error || 'Job not found'}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            ← Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Jobs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {autoRefresh && (
            <span className="text-sm text-gray-500 flex items-center">
              🔄 Auto-refreshing
            </span>
          )}
          <button 
            onClick={() => fetchJobDetail(false)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Job Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Job ID</label>
            <p className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
              {job.id}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStateColor(job.state)}`}>
              {getStateIcon(job.state)} {job.state}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
            <p className="text-sm text-gray-900">{job.type || 'Unknown'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Duration</label>
            <p className="text-sm text-gray-900">
              {formatDuration(job.started_at, job.finished_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {(job.state === 'RUNNING' || job.progress !== undefined) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {job.current_step || 'Processing...'}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(job.progress || 0)}%
                </span>
              </div>
              {renderProgressBar(job.progress)}
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
        
        <div className="space-y-3">
          {job.created_at && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Created:</span>
              <span className="text-sm text-gray-900">{new Date(job.created_at).toLocaleString()}</span>
            </div>
          )}
          
          {job.started_at && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Started:</span>
              <span className="text-sm text-gray-900">{new Date(job.started_at).toLocaleString()}</span>
            </div>
          )}
          
          {job.finished_at && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Finished:</span>
              <span className="text-sm text-gray-900">{new Date(job.finished_at).toLocaleString()}</span>
            </div>
          )}
          
          {job.updated_at && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Last Updated:</span>
              <span className="text-sm text-gray-900">{new Date(job.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Parameters */}
      {job.params && (
        <div className="mb-6">
          {renderJsonData(job.params, 'Input Parameters')}
        </div>
      )}

      {/* Results */}
      {job.result && (
        <div className="mb-6">
          {renderJsonData(job.result, 'Results')}
        </div>
      )}

      {/* Error Details */}
      {job.error && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">❌ Error Details</h4>
            <pre className="text-sm text-red-700 overflow-x-auto whitespace-pre-wrap">
              {typeof job.error === 'string' ? job.error : JSON.stringify(job.error, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
