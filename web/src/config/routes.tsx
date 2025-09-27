import React from 'react';
import JobsDashboard from '../features/jobs/components/JobsDashboard';
import { CatalogPage } from '../features/catalog';
import { JobDetailPage } from '../features/jobs';

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
    element: JobDetailPage,
  },
  {
    path: '/self-service',
    element: CatalogPage,
  }
];
