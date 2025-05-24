import React, { useState } from 'react';
import axios from 'axios';
import DataSourceStatus from './components/dashboard/DataSourceStatus';

const TestDataSourceStatus: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<string>('Checking authentication...');
  const [token, setToken] = useState<string | null>(null);

  const quickLogin = async () => {
    try {
      setAuthStatus('Attempting quick login...');
      
      // Try to register or login a test user
      let response;
      try {
        response = await axios.post('/api/auth/register', {
          email: 'test.datasource@test.com',
          password: 'test123',
          name: 'DataSource Test User'
        });
      } catch (registerError) {
        // If registration fails, try login
        response = await axios.post('/api/auth/login', {
          email: 'test.datasource@test.com',
          password: 'test123'
        });
      }
      
      if (response.data?.success && response.data?.data?.token) {
        const token = response.data.data.token;
        localStorage.setItem('token', token);
        setToken(token);
        setAuthStatus('Successfully authenticated!');
        
        // Set axios auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('Authentication successful, token set');
      } else {
        setAuthStatus('Authentication failed - invalid response');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setAuthStatus(`Authentication failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const checkCurrentAuth = () => {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      setToken(currentToken);
      setAuthStatus('Token found in localStorage');
      axios.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
    } else {
      setAuthStatus('No token found - need to login');
    }
  };

  React.useEffect(() => {
    checkCurrentAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Data Source Status Test
        </h1>
        
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
            Authentication Status
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            {authStatus}
          </p>
          {token && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-mono mb-4">
              Token: {token.substring(0, 50)}...
            </p>
          )}
          <div className="flex space-x-4">
            <button
              onClick={quickLogin}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Quick Login
            </button>
            <button
              onClick={checkCurrentAuth}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Check Auth
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Testing DataSourceStatus Component
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This page tests the DataSourceStatus component independently. 
            Check the browser console for API calls and debug information.
          </p>
        </div>

        {token ? (
          <DataSourceStatus />
        ) : (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-700 dark:text-red-400">
              Please authenticate first to test the DataSourceStatus component.
            </p>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-md font-medium text-blue-900 dark:text-blue-100 mb-2">
            Debugging Info
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Check browser console for API requests</li>
            <li>• API should call: http://localhost:5001/api/analysis/data-sources/status</li>
            <li>• Expected response: status object with all services online</li>
            <li>• Component should show <strong>5 active sources out of 5 total</strong></li>
            <li>• All services should be ✅ Online: Price Monitoring, Social Sentiment, News Analysis, Technical Analysis, Market Data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestDataSourceStatus; 