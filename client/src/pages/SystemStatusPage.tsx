import React from 'react';
import SystemStatus from '../components/SystemStatus';

const SystemStatusPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
          <p className="mt-2 text-gray-600">
            Monitor system performance, API rate limits, and cache status
          </p>
        </div>
        
        <SystemStatus />
      </div>
    </div>
  );
};

export default SystemStatusPage; 