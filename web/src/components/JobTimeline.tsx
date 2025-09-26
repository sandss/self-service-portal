import React from 'react';

interface JobTimelineProps {
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
}

export const JobTimeline: React.FC<JobTimelineProps> = ({
  createdAt,
  startedAt,
  finishedAt,
  updatedAt
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
      
      <div className="space-y-3">
        {createdAt && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Created:</span>
            <span className="text-sm text-gray-900">{new Date(createdAt).toLocaleString()}</span>
          </div>
        )}
        
        {startedAt && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Started:</span>
            <span className="text-sm text-gray-900">{new Date(startedAt).toLocaleString()}</span>
          </div>
        )}
        
        {finishedAt && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Finished:</span>
            <span className="text-sm text-gray-900">{new Date(finishedAt).toLocaleString()}</span>
          </div>
        )}
        
        {updatedAt && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Last Updated:</span>
            <span className="text-sm text-gray-900">{new Date(updatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
