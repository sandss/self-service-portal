import React from 'react';
import { JsonViewer } from './JsonViewer';

interface JobDataSectionProps {
  params?: any;
  result?: any;
  error?: any;
}

export const JobDataSection: React.FC<JobDataSectionProps> = ({
  params,
  result,
  error
}) => {
  return (
    <>
      {params && (
        <JsonViewer 
          data={params} 
          title="Input Parameters" 
          defaultExpanded={Object.keys(params).length <= 5}
        />
      )}

      {result && (
        <JsonViewer 
          data={result} 
          title="Results" 
          defaultExpanded={Object.keys(result).length <= 3}
        />
      )}

      {error && (
        <JsonViewer 
          data={error} 
          title="Error Details" 
          isError={true}
          defaultExpanded={true}
        />
      )}
    </>
  );
};
