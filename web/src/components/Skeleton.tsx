import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  rounded = true 
}) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 ${rounded ? 'rounded' : ''} ${width} ${height} ${className}`}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ 
  lines = 3, 
  className = '' 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton 
          key={i}
          width={i === lines - 1 ? 'w-3/4' : 'w-full'} 
          height="h-4"
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton width="w-8" height="h-8" rounded />
          <div className="flex-1">
            <Skeleton width="w-32" height="h-5" className="mb-2" />
            <Skeleton width="w-24" height="h-4" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </div>
    </div>
  );
};
