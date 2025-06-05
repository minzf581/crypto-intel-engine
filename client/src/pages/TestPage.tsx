import { useState } from 'react';
import axios from 'axios';

const TestPage = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testAssetAPI = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const testData = { assets: ['BTC', 'ETH', 'ADA'] };
      console.log('Sending test data:', testData);

      // Test with the test endpoint first
      const testResponse = await axios.post('/api/users/assets/test', testData);
      console.log('Test endpoint response:', testResponse.data);
      
      // Test with the actual endpoint
      const actualResponse = await axios.post('/api/users/assets', testData);
      console.log('Actual endpoint response:', actualResponse.data);

      setTestResult({
        testEndpoint: testResponse.data,
        actualEndpoint: actualResponse.data
      });

    } catch (err: any) {
      console.error('Test failed:', err);
      setError(err.response?.data?.message || err.message);
      
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response data:', err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const testWithSelectedAssets = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      // Simulate the actual assets being sent from AssetContext
      const selectedAssets = ['BTC', 'ETH', 'SOL', 'ADA'];
      const testData = { assets: selectedAssets };
      
      console.log('Testing with selected assets:', testData);

      const response = await axios.post('/api/users/assets', testData);
      console.log('Response:', response.data);

      setTestResult({
        message: 'Success! Assets saved successfully',
        response: response.data
      });

    } catch (err: any) {
      console.error('Test with selected assets failed:', err);
      setError(err.response?.data?.message || err.message);
      
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response data:', err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Asset API Test Page</h1>
      
      <div className="space-y-4">
        <button
          onClick={testAssetAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Asset API (Debug)'}
        </button>

        <button
          onClick={testWithSelectedAssets}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Save Selected Assets'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {testResult && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold">Test Result:</h3>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestPage; 