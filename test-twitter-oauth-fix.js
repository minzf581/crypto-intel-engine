#!/usr/bin/env node

/**
 * Test script to verify Twitter OAuth fix
 * This script tests that the server can start without Twitter OAuth configuration
 */

const { spawn } = require('child_process');
const axios = require('axios');

const TEST_PORT = 3002;
const TEST_TIMEOUT = 10000; // 10 seconds

console.log('🧪 Testing Twitter OAuth Fix...\n');

// Test 1: Server starts without Twitter OAuth config
async function testServerStartup() {
  console.log('📋 Test 1: Server startup without Twitter OAuth configuration');
  
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: TEST_PORT,
      // Explicitly unset Twitter OAuth variables
      TWITTER_CLIENT_ID: undefined,
      TWITTER_CLIENT_SECRET: undefined
    };

    const server = spawn('node', ['server.js'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let hasStarted = false;

    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server listening on port')) {
        hasStarted = true;
        console.log('✅ Server started successfully');
        server.kill('SIGTERM');
        resolve(true);
      }
    });

    server.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Twitter OAuth 2.0 configuration required')) {
        console.log('❌ Server failed to start - Twitter OAuth still required');
        server.kill('SIGTERM');
        resolve(false);
      }
    });

    server.on('close', (code) => {
      if (!hasStarted && code !== 0) {
        console.log(`❌ Server exited with code ${code}`);
        console.log('Output:', output);
        resolve(false);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!hasStarted) {
        console.log('⏰ Test timeout - server did not start within 10 seconds');
        server.kill('SIGTERM');
        resolve(false);
      }
    }, TEST_TIMEOUT);
  });
}

// Test 2: Health check endpoint works
async function testHealthCheck() {
  console.log('\n📋 Test 2: Health check endpoint');
  
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: TEST_PORT,
      TWITTER_CLIENT_ID: undefined,
      TWITTER_CLIENT_SECRET: undefined
    };

    const server = spawn('node', ['server.js'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let hasStarted = false;

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server listening on port') && !hasStarted) {
        hasStarted = true;
        
        // Wait a moment for server to be ready
        setTimeout(async () => {
          try {
            const response = await axios.get(`http://localhost:${TEST_PORT}/health`, {
              timeout: 5000
            });
            
            if (response.status === 200 && response.data.status === 'OK') {
              console.log('✅ Health check endpoint working');
              resolve(true);
            } else {
              console.log('❌ Health check returned unexpected response');
              resolve(false);
            }
          } catch (error) {
            console.log('❌ Health check failed:', error.message);
            resolve(false);
          } finally {
            server.kill('SIGTERM');
          }
        }, 2000);
      }
    });

    server.on('close', (code) => {
      if (!hasStarted) {
        console.log(`❌ Server failed to start for health check test`);
        resolve(false);
      }
    });

    // Timeout
    setTimeout(() => {
      if (!hasStarted) {
        console.log('⏰ Health check test timeout');
        server.kill('SIGTERM');
        resolve(false);
      }
    }, TEST_TIMEOUT);
  });
}

// Test 3: Twitter OAuth status endpoint
async function testTwitterOAuthStatus() {
  console.log('\n📋 Test 3: Twitter OAuth status endpoint');
  
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: TEST_PORT,
      TWITTER_CLIENT_ID: undefined,
      TWITTER_CLIENT_SECRET: undefined
    };

    const server = spawn('node', ['server.js'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let hasStarted = false;

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server listening on port') && !hasStarted) {
        hasStarted = true;
        
        setTimeout(async () => {
          try {
            const response = await axios.get(`http://localhost:${TEST_PORT}/api/auth/twitter/status`, {
              timeout: 5000
            });
            
            if (response.status === 200 && 
                response.data.success === true && 
                response.data.available === false) {
              console.log('✅ Twitter OAuth status correctly shows as unavailable');
              resolve(true);
            } else {
              console.log('❌ Twitter OAuth status returned unexpected response');
              console.log('Response:', response.data);
              resolve(false);
            }
          } catch (error) {
            console.log('❌ Twitter OAuth status test failed:', error.message);
            resolve(false);
          } finally {
            server.kill('SIGTERM');
          }
        }, 2000);
      }
    });

    server.on('close', (code) => {
      if (!hasStarted) {
        console.log(`❌ Server failed to start for Twitter OAuth status test`);
        resolve(false);
      }
    });

    setTimeout(() => {
      if (!hasStarted) {
        console.log('⏰ Twitter OAuth status test timeout');
        server.kill('SIGTERM');
        resolve(false);
      }
    }, TEST_TIMEOUT);
  });
}

// Run all tests
async function runTests() {
  console.log('Starting Twitter OAuth fix tests...\n');
  
  const results = [];
  
  try {
    results.push(await testServerStartup());
    results.push(await testHealthCheck());
    results.push(await testTwitterOAuthStatus());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! Twitter OAuth fix is working correctly.');
      console.log('✅ Server can start without Twitter OAuth configuration');
      console.log('✅ Health check endpoint works');
      console.log('✅ Twitter OAuth status correctly shows as unavailable');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please check the issues above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Tests interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Tests terminated');
  process.exit(1);
});

// Run tests
runTests(); 