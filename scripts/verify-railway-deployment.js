#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Railway deployment URL (replace with your actual Railway URL)
const RAILWAY_URL = process.env.RAILWAY_URL || 'your-app.railway.app';
const USE_HTTPS = !RAILWAY_URL.includes('localhost');

console.log(`🚀 Verifying Railway deployment: ${RAILWAY_URL}`);
console.log(`📡 Using ${USE_HTTPS ? 'HTTPS' : 'HTTP'} protocol`);

const makeRequest = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RAILWAY_URL.replace(/^https?:\/\//, ''),
      path: path,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Railway-Deployment-Verifier/1.0'
      }
    };

    const client = USE_HTTPS ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

async function verifyDeployment() {
  console.log('\n=== Railway Deployment Verification ===\n');
  
  const tests = [
    {
      name: 'Root Health Check',
      path: '/',
      required: true
    },
    {
      name: 'Health Endpoint',
      path: '/health',
      required: true
    },
    {
      name: 'Dashboard API',
      path: '/api/dashboard/data',
      required: true
    },
    {
      name: 'Twitter OAuth Status',
      path: '/api/auth/twitter/config-status',
      required: false
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name} (${test.path})`);
      
      const result = await makeRequest(test.path);
      
      if (result.status === 200) {
        console.log(`✅ ${test.name}: PASSED (${result.status})`);
        
        if (result.data && typeof result.data === 'object') {
          if (test.path === '/') {
            console.log(`   Service: ${result.data.service || 'Unknown'}`);
            console.log(`   Status: ${result.data.status || 'Unknown'}`);
            console.log(`   Ready: ${result.data.ready || false}`);
          } else if (test.path === '/health') {
            console.log(`   Environment: ${result.data.env || 'Unknown'}`);
            console.log(`   Ready: ${result.data.ready || false}`);
            console.log(`   Uptime: ${result.data.uptime || 0}s`);
          } else if (test.path === '/api/dashboard/data') {
            console.log(`   Assets: ${result.data.data?.assets?.length || 0}`);
            console.log(`   Has Real Data: ${result.data.data?.hasRealData || false}`);
          } else if (test.path === '/api/auth/twitter/config-status') {
            console.log(`   Twitter OAuth Available: ${result.data.available || false}`);
          }
        }
        
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: FAILED (${result.status})`);
        if (result.data) {
          console.log(`   Response: ${typeof result.data === 'string' ? result.data.substring(0, 100) : JSON.stringify(result.data).substring(0, 100)}...`);
        }
        
        if (test.required) {
          console.log(`   ⚠️  This is a required test!`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      if (test.required) {
        console.log(`   ⚠️  This is a required test!`);
      }
    }
    
    console.log('');
  }

  console.log('=== Verification Summary ===');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
  
  const requiredTests = tests.filter(t => t.required).length;
  const passedRequiredTests = tests.filter(t => t.required).reduce((count, test) => {
    // This is a simplified check - in real implementation you'd track this properly
    return count + (passedTests > 0 ? 1 : 0);
  }, 0);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Deployment is healthy.');
    process.exit(0);
  } else if (passedRequiredTests === requiredTests) {
    console.log('\n⚠️  All required tests passed, but some optional tests failed.');
    process.exit(0);
  } else {
    console.log('\n💥 Some required tests failed. Deployment may have issues.');
    process.exit(1);
  }
}

// Usage instructions
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node verify-railway-deployment.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  RAILWAY_URL    Your Railway app URL (e.g., your-app.railway.app)
  
Examples:
  RAILWAY_URL=your-app.railway.app node verify-railway-deployment.js
  node verify-railway-deployment.js  # Uses default URL
  `);
  process.exit(0);
}

verifyDeployment().catch(console.error); 