import React from 'react';
import JobsDashboard from '../components/JobsDashboard';
import Catalog from '../pages/Catalog';
import JobDetail from '../pages/JobDetail';

export interface RouteConfig {
  path: string;
  element: React.ComponentType<any>;
  key?: string;
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    element: JobsDashboard,
    key: 'jobs-dashboard'
  },
  {
    path: '/jobs/:jobId',
    element: JobDetail,
  },
  {
    path: '/self-service',
    element: Catalog,
  }
];
