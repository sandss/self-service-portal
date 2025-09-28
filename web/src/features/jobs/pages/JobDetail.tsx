import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobDetail } from '../hooks';
import { 
  JobHeader, 
  JobSummaryCard, 
  JobProgressSection, 
  JobTimeline, 
  JobDataSection, 
  JobLoading, 
  JobError 
} from '../components';

const JobDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  
  const {
    job,
    loading,
    loadingState,
    error,
    autoRefresh,
    retryCount,
    fetchJobDetail
  } = useJobDetail(jobId);

  console.log('JobDetail component mounted, jobId:', jobId);
  console.log('Render state - loading:', loading, 'error:', error, 'job:', job ? 'present' : 'null');

  const handleBackClick = () => navigate('/');
  const handleRefresh = () => fetchJobDetail(false);
  const handleRetry = () => fetchJobDetail(true);

  if (loading) {
    return (
      <JobLoading 
        loadingState={loadingState}
        retryCount={retryCount}
      />
    );
  }

  if (error || !job) {
    return (
      <JobError 
        error={error}
        onBackClick={handleBackClick}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <JobHeader 
        onBackClick={handleBackClick}
        autoRefresh={autoRefresh}
        onRefresh={handleRefresh}
      />

      <JobSummaryCard job={job} />

      <JobProgressSection 
        state={job.state}
        progress={job.progress}
        currentStep={job.current_step}
      />

      <JobTimeline 
        createdAt={job.created_at}
        startedAt={job.started_at}
        finishedAt={job.finished_at}
        updatedAt={job.updated_at}
      />

      <JobDataSection 
        params={job.params}
        result={job.result}
        error={job.error}
      />
    </div>
  );
};

export default JobDetail;
