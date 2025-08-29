export interface Job {
  id: string;
  type: string;
  state: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  progress: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
  params?: Record<string, any>;
  result?: Record<string, any>;
  error?: Record<string, any>;
}

export interface JobList {
  items: Job[];
  page: number;
  page_size: number;
  total: number;
}

export interface JobCreate {
  report_type: string;
  parameters: Record<string, any>;
  user_id?: string;
}
