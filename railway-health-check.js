#!/usr/bin/env node

// Railway health check test script
const http = require('http');

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🔍 Testing Railway health check...');
console.log(`   Host: ${HOST}`);
console.log(`   Port: ${PORT}`);

// Test health check endpoint
const testHealthCheck = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Health check response:', response);
          resolve(response);
        } catch (error) {
          console.error('❌ Invalid JSON response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Health check failed:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Health check timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

// Test root endpoint
const testRootEndpoint = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
      port: PORT,
      path: '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Root endpoint response:', response);
          resolve(response);
        } catch (error) {
          console.error('❌ Invalid JSON response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Root endpoint failed:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Root endpoint timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

// Run tests
const runTests = async () => {
  try {
    console.log('\n🧪 Testing health endpoints...\n');
    
    await testRootEndpoint();
    await testHealthCheck();
    
    console.log('\n🎉 All health checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Health check tests failed:', error.message);
    process.exit(1);
  }
};

runTests(); 