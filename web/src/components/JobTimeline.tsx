import React from 'react';

interface JobTimelineProps {
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
}

interface TimelineItemProps {
  icon: string;
  label: string;
  timestamp?: string;
  isCompleted?: boolean;
  isActive?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ 
  icon, 
  label, 
  timestamp, 
  isCompleted = false,
  isActive = false 
}) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString();

  return (
    <div className="flex items-center space-x-4 py-3">
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
        ${isCompleted ? 'bg-green-100 text-green-600' : isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
        ${isActive ? 'ring-2 ring-blue-200' : ''}
      `}>
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-500'}`}>
            {label}
          </p>
          <div className="text-right">
            <p className="text-sm font-mono text-gray-900">{formattedDate}</p>
            <p className="text-xs text-gray-500">{formattedTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const calculateDuration = (start?: string, end?: string): string => {
  if (!start) return '';
  
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s`;
  return `${Math.floor(diffSeconds / 3600)}h ${Math.floor((diffSeconds % 3600) / 60)}m`;
};

export const JobTimeline: React.FC<JobTimelineProps> = ({
  createdAt,
  startedAt,
  finishedAt,
  updatedAt
}) => {
  const hasStarted = !!startedAt;
  const hasFinished = !!finishedAt;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">⏱️</span>
          Timeline
        </h3>
        
        {hasStarted && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Duration</div>
            <div className="text-lg font-semibold text-gray-900">
              {calculateDuration(startedAt, finishedAt)}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-1 relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-8 bottom-0 w-px bg-gray-200"></div>
        
        <TimelineItem
          icon="📝"
          label="Created"
          timestamp={createdAt}
          isCompleted={!!createdAt}
        />
        
        <TimelineItem
          icon="🚀"
          label="Started"
          timestamp={startedAt}
          isCompleted={hasStarted}
          isActive={hasStarted && !hasFinished}
        />
        
        <TimelineItem
          icon={hasFinished ? "🏁" : "⏳"}
          label={hasFinished ? "Finished" : "In Progress"}
          timestamp={finishedAt}
          isCompleted={hasFinished}
          isActive={hasStarted && !hasFinished}
        />
        
        {updatedAt && updatedAt !== finishedAt && (
          <TimelineItem
            icon="🔄"
            label="Last Updated"
            timestamp={updatedAt}
            isCompleted={true}
          />
        )}
      </div>

      {/* Progress indicator for running jobs */}
      {hasStarted && !hasFinished && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-blue-700 font-medium">Job is currently running</span>
          </div>
        </div>
      )}
    </div>
  );
};
