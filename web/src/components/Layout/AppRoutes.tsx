import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { routes } from '../../config/routes';
import { useLayout } from '../../hooks/useLayout';

export function AppRoutes() {
  const { refreshKey } = useLayout();

  return (
    <Routes>
      {routes.map((route) => {
        const Component = route.element;
        const key = route.key || route.path;
        
        // Add refresh key to the jobs dashboard component
        const element = key === 'jobs-dashboard' 
          ? <Component key={refreshKey} />
          : <Component />;

        return (
          <Route 
            key={key}
            path={route.path} 
            element={element} 
          />
        );
      })}
    </Routes>
  );
}
