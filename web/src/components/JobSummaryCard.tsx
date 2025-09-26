import React from 'react';
import { getStateColor, getStateIcon, formatDuration } from '../utils/jobUtils';

interface JobDetail {
  id: string;
  state: string;
  type?: string;
  started_at?: string;
  finished_at?: string;
}

interface JobSummaryCardProps {
  job: JobDetail;
}

export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({ job }) => {
  return (
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
  );
};
