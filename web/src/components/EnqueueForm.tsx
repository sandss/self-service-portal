import React, { useState } from 'react';
import { api } from '../api';

interface EnqueueFormProps {
  onJobCreated: () => void;
}

const EnqueueForm = ({ onJobCreated }: EnqueueFormProps) => {
  const [reportType, setReportType] = useState('sales_report');
  const [parameters, setParameters] = useState('{"region": "US", "month": "2024-01"}');
  const [userId, setUserId] = useState('demo_user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedParameters = JSON.parse(parameters);
      await api.createJob({
        report_type: reportType,
        parameters: parsedParameters,
        user_id: userId,
      });
      
      // Reset form
      setParameters('{"region": "US", "month": "2024-01"}');
      onJobCreated();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON in parameters field');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create job');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
            Report Type
          </label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="sales_report">Sales Report</option>
            <option value="user_analytics">User Analytics</option>
            <option value="financial_summary">Financial Summary</option>
            <option value="inventory_check">Inventory Check</option>
            <option value="performance_metrics">Performance Metrics</option>
          </select>
        </div>

        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="md:flex md:items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Enqueue Job'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="parameters" className="block text-sm font-medium text-gray-700 mb-1">
          Parameters (JSON)
        </label>
        <textarea
          id="parameters"
          rows={3}
          value={parameters}
          onChange={(e) => setParameters(e.target.value)}
          placeholder='{"key": "value"}'
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
        />
      </div>
    </form>
  );
};

export default EnqueueForm;
