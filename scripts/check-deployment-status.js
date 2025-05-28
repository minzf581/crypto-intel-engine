#!/usr/bin/env node

/**
 * Quick deployment status checker
 * Usage: node scripts/check-deployment-status.js [URL]
 */

const https = require('https');
const http = require('http');

const url = process.argv[2] || 'localhost:3001';
const useHttps = !url.includes('localhost') && !url.includes('127.0.0.1');

console.log(`🔍 Checking deployment status: ${url}`);
console.log(`📡 Protocol: ${useHttps ? 'HTTPS' : 'HTTP'}`);

const checkEndpoint = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.replace(/^https?:\/\//, ''),
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const client = useHttps ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

async function checkStatus() {
  try {
    console.log('\n🧪 Testing root health check...');
    const rootCheck = await checkEndpoint('/');
    
    if (rootCheck.status === 200) {
      console.log('✅ Root health check: PASSED');
      if (rootCheck.data.service) {
        console.log(`   Service: ${rootCheck.data.service}`);
        console.log(`   Status: ${rootCheck.data.status}`);
        console.log(`   Ready: ${rootCheck.data.ready}`);
      }
    } else {
      console.log(`❌ Root health check: FAILED (${rootCheck.status})`);
    }

    console.log('\n🧪 Testing API endpoint...');
    const apiCheck = await checkEndpoint('/api/dashboard/data');
    
    if (apiCheck.status === 200) {
      console.log('✅ API endpoint: PASSED');
      if (apiCheck.data.data && apiCheck.data.data.assets) {
        console.log(`   Assets: ${apiCheck.data.data.assets.length}`);
        console.log(`   Real data: ${apiCheck.data.data.hasRealData}`);
      }
    } else {
      console.log(`❌ API endpoint: FAILED (${apiCheck.status})`);
    }

    console.log('\n📊 Summary:');
    const healthOk = rootCheck.status === 200;
    const apiOk = apiCheck.status === 200;
    
    if (healthOk && apiOk) {
      console.log('🎉 Deployment is healthy!');
      process.exit(0);
    } else {
      console.log('💥 Deployment has issues');
      process.exit(1);
    }

  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    process.exit(1);
  }
}

checkStatus(); 