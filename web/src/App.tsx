import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppLayout, AppRoutes } from './components/Layout';
import './index.css';

// Layout components moved to ./components/Layout/

function AppContent() {
  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
