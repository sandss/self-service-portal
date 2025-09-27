export const getStateColor = (state: string): string => {
  switch (state) {
    case 'SUCCEEDED': return 'text-green-600 bg-green-100';
    case 'FAILED': return 'text-red-600 bg-red-100';
    case 'RUNNING': return 'text-blue-600 bg-blue-100';
    case 'QUEUED': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const getStateIcon = (state: string): string => {
  switch (state) {
    case 'SUCCEEDED': return '✅';
    case 'FAILED': return '❌';
    case 'RUNNING': return '🔄';
    case 'QUEUED': return '⏳';
    default: return '❓';
  }
};

export const formatDuration = (startTime?: string, endTime?: string): string => {
  if (!startTime) return 'N/A';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const duration = Math.round((end.getTime() - start.getTime()) / 1000);
  
  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
};
