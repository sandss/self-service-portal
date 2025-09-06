import React, { useState } from 'react';
import { api } from '../api';

interface SelfServiceProps {
  onJobCreated: () => void;
}

const SelfService = ({ onJobCreated }: SelfServiceProps) => {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Server provisioning form state
  const [serverConfig, setServerConfig] = useState({
    name: '',
    instance_type: 't3.medium',
    region: 'us-east-1',
    tags: {}
  });

  const services = [
    {
      id: 'server',
      title: 'Server Provisioning',
      description: 'Deploy a new virtual server with custom configuration',
      icon: '🖥️',
      estimatedTime: '5-10 minutes',
      features: ['Custom instance types', 'Multiple regions', 'Auto-configured security', 'SSH key setup']
    },
    {
      id: 'database',
      title: 'Database Setup',
      description: 'Create and configure a managed database instance',
      icon: '🗄️',
      estimatedTime: '3-7 minutes',
      features: ['MySQL/PostgreSQL', 'Automated backups', 'High availability', 'Performance monitoring'],
      comingSoon: true
    },
    {
      id: 'storage',
      title: 'Storage Bucket',
      description: 'Set up secure cloud storage with access controls',
      icon: '💾',
      estimatedTime: '2-5 minutes',
      features: ['Encrypted storage', 'Access policies', 'Versioning', 'CDN integration'],
      comingSoon: true
    },
    {
      id: 'network',
      title: 'Network Setup',
      description: 'Configure VPC, subnets, and security groups',
      icon: '🌐',
      estimatedTime: '4-8 minutes',
      features: ['Custom VPC', 'Public/Private subnets', 'Security groups', 'NAT gateway'],
      comingSoon: true
    }
  ];

  const instanceTypes = [
    { value: 't3.micro', label: 't3.micro (1 vCPU, 1 GB RAM) - Free tier' },
    { value: 't3.small', label: 't3.small (2 vCPU, 2 GB RAM)' },
    { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GB RAM)' },
    { value: 't3.large', label: 't3.large (2 vCPU, 8 GB RAM)' },
    { value: 'c5.large', label: 'c5.large (2 vCPU, 4 GB RAM) - Compute optimized' },
    { value: 'm5.large', label: 'm5.large (2 vCPU, 8 GB RAM) - General purpose' }
  ];

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' }
  ];

  const handleProvisionServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:8000/provision/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to start server provisioning');
      }

      const result = await response.json();
      
      // Reset form and close modal
      setServerConfig({
        name: '',
        instance_type: 't3.medium',
        region: 'us-east-1',
        tags: {}
      });
      setActiveService(null);
      setSuccess(`Server provisioning job created successfully! Job ID: ${result.job_id}`);
      onJobCreated();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start provisioning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Self-Service Portal</h2>
        <p className="mt-2 text-gray-600">Provision and manage your infrastructure resources</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div
            key={service.id}
            className={`relative bg-white rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 ${
              service.comingSoon
                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                : 'border-gray-200 hover:border-indigo-500 hover:shadow-lg'
            }`}
            onClick={() => !service.comingSoon && setActiveService(service.id)}
          >
            {service.comingSoon && (
              <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                Coming Soon
              </div>
            )}
            
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{service.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                <p className="mt-2 text-xs text-indigo-600 font-medium">
                  Estimated time: {service.estimatedTime}
                </p>
                
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-indigo-500 rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Server Provisioning Modal */}
      {activeService === 'server' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Provision New Server</h3>
                <button
                  onClick={() => setActiveService(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleProvisionServer} className="space-y-4">
                <div>
                  <label htmlFor="serverName" className="block text-sm font-medium text-gray-700 mb-1">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    id="serverName"
                    required
                    value={serverConfig.name}
                    onChange={(e) => setServerConfig({ ...serverConfig, name: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="my-web-server"
                  />
                </div>

                <div>
                  <label htmlFor="instanceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Instance Type
                  </label>
                  <select
                    id="instanceType"
                    value={serverConfig.instance_type}
                    onChange={(e) => setServerConfig({ ...serverConfig, instance_type: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {instanceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    id="region"
                    value={serverConfig.region}
                    onChange={(e) => setServerConfig({ ...serverConfig, region: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {regions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-orange-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• Server configuration will be validated</li>
                    <li>• Compute resources will be allocated</li>
                    <li>• Operating system and software will be installed</li>
                    <li>• Security groups and SSH access will be configured</li>
                    <li>• You'll receive connection details once complete</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setActiveService(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Starting Provisioning...' : 'Start Provisioning'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfService;
