import React, { useState, useEffect, useCallback } from 'react';
import { Job, JobList } from '../types';
import { api } from '../api';
import JobTable from './JobTable';
import JobFilters from './JobFilters';

const JobsDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    state: '',
    q: '',
  });

  const fetchJobs = useCallback(async () => {
    try {
      console.log('Fetching jobs with filters:', filters, 'page:', page);
      setLoading(true);
      setError(null);
      const data: JobList = await api.fetchJobs({
        ...filters,
        page,
        page_size: pageSize,
      });
      console.log('Jobs fetched successfully:', data);
      setJobs(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    // Temporarily disable WebSocket to debug hanging issue
    console.log('WebSocket disabled for debugging');
    /*
    try {
      const websocket = new WebSocket(api.getWebSocketUrl());
      
      websocket.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update.type === 'upsert' && update.job) {
            setJobs((prevJobs: Job[]) => {
              const updatedJobs = [...prevJobs];
              const existingIndex = updatedJobs.findIndex(job => job.id === update.job.id);
              
              if (existingIndex >= 0) {
                updatedJobs[existingIndex] = update.job;
              } else {
                // New job, add to beginning
                updatedJobs.unshift(update.job);
              }
              
              return updatedJobs;
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        websocket.close();
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
    */
  }, []);

  // Fetch jobs on component mount and when filters change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRetryJob = async (jobId: string) => {
    try {
      await api.retryJob(jobId);
      // Refresh jobs list
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry job');
    }
  };

  const handleFiltersChange = (newFilters: { state: string; q: string }) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Jobs</h2>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading...' : `${total} total jobs`}
          </p>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <JobFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Table */}
        <JobTable
          jobs={jobs}
          loading={loading}
          onRetryJob={handleRetryJob}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages} ({total} total jobs)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsDashboard;
