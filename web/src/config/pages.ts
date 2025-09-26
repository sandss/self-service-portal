export interface PageConfig {
  title: string;
  description: string;
}

export interface PageConfigMap {
  [path: string]: PageConfig;
}

export const pageConfigs: PageConfigMap = {
  '/': {
    title: 'Jobs',
    description: 'Monitor and manage background jobs in real-time'
  },
  '/jobs': {
    title: 'Jobs', 
    description: 'Monitor and manage background jobs in real-time'
  },
  '/self-service': {
    title: 'Catalog',
    description: 'Provision and manage your infrastructure resources'
  }
};

export function getPageConfig(pathname: string): PageConfig {
  // Exact match first
  if (pageConfigs[pathname]) {
    return pageConfigs[pathname];
  }
  
  // Check for dynamic routes (e.g., /jobs/:jobId)
  if (pathname.startsWith('/jobs/')) {
    return {
      title: 'Job Details',
      description: 'View and manage job execution details'
    };
  }
  
  // Default fallback
  return {
    title: 'Dashboard',
    description: 'Welcome to the self-service portal'
  };
}
