import { CatalogForm } from './CatalogForm';
import { SuccessMessage, LoadingSpinner } from '../../../shared/components';
import { CatalogDescriptor } from '../../../types/catalog';

interface FormViewProps {
  selected: string;
  version: string;
  descriptor: CatalogDescriptor;
  isCreatingJob: boolean;
  result: { job_id: string } | null;
  loading: boolean;
  onSubmit: (data: any) => Promise<void>;
  onBack: () => void;
}

export function FormView({ 
  selected,
  version,
  descriptor, 
  isCreatingJob, 
  result,
  loading,
  onSubmit, 
  onBack 
}: FormViewProps) {
  if (loading) {
    return <LoadingSpinner message="Loading configuration form..." />;
  }

  if (result) {
    return <SuccessMessage jobId={result.job_id} />;
  }
  
  return (
    <CatalogForm
      selected={selected}
      version={version}
      descriptor={descriptor}
      isCreatingJob={isCreatingJob}
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
}
