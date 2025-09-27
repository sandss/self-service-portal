import React from 'react';
import { getStateColor, getStateIcon, formatDuration } from '../utils/jobUtils';
import { CopyButton } from './CopyButton';

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

const SummaryField: React.FC<{
  label: string;
  value: string | React.ReactNode;
  copyable?: boolean;
  copyText?: string;
}> = ({ label, value, copyable = false, copyText }) => {
  return (
    <div className="group">
      <label className="block text-sm font-medium text-gray-500 mb-1 transition-colors group-hover:text-gray-700">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          {typeof value === 'string' ? (
            <p className="text-sm text-gray-900 break-all">{value}</p>
          ) : (
            value
          )}
        </div>
        {copyable && copyText && (
          <CopyButton text={copyText} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
};

export const JobSummaryCard: React.FC<JobSummaryCardProps> = ({ job }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-shadow hover:shadow-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryField
          label="Job ID"
          value={
            <p className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded truncate">
              {job.id}
            </p>
          }
          copyable={true}
          copyText={job.id}
        />
        
        <SummaryField
          label="Status"
          value={
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${getStateColor(job.state)}`}>
              <span className="mr-1">{getStateIcon(job.state)}</span>
              {job.state}
            </span>
          }
        />
        
        <SummaryField
          label="Type"
          value={
            <div className="flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                {job.type || 'Unknown'}
              </span>
            </div>
          }
        />
        
        <SummaryField
          label="Duration"
          value={
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900">
                {formatDuration(job.started_at, job.finished_at)}
              </span>
              {job.started_at && !job.finished_at && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
};
