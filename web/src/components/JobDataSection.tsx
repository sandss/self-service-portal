import React from 'react';

interface JobDataSectionProps {
  params?: any;
  result?: any;
  error?: any;
}

const JsonDataDisplay: React.FC<{ data: any; title: string; isError?: boolean }> = ({ 
  data, 
  title, 
  isError = false 
}) => {
  if (!data) return null;
  
  const bgColor = isError ? 'bg-red-50' : 'bg-gray-50';
  const borderColor = isError ? 'border-red-200' : '';
  const textColor = isError ? 'text-red-700' : 'text-gray-700';
  const titleColor = isError ? 'text-red-900' : 'text-gray-900';
  const icon = isError ? '❌ ' : '';
  
  return (
    <div className={`${bgColor} ${borderColor} rounded-lg p-4 mb-6`}>
      <h4 className={`font-medium ${titleColor} mb-2`}>{icon}{title}</h4>
      <pre className={`text-sm ${textColor} overflow-x-auto whitespace-pre-wrap`}>
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export const JobDataSection: React.FC<JobDataSectionProps> = ({
  params,
  result,
  error
}) => {
  return (
    <>
      {params && (
        <JsonDataDisplay data={params} title="Input Parameters" />
      )}

      {result && (
        <JsonDataDisplay data={result} title="Results" />
      )}

      {error && (
        <JsonDataDisplay data={error} title="Error Details" isError={true} />
      )}
    </>
  );
};
