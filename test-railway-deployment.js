#!/usr/bin/env node

/**
 * Railway Deployment Test Script
 * Tests the deployment configuration and server startup
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Railway Deployment Test');
console.log('==========================\n');

// Test 1: Check required files
console.log('📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'railway.json',
  'nixpacks.toml',
  'server.js',
  'server/package.json',
  'server/dist/index.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please fix before deploying.');
  process.exit(1);
}

// Test 2: Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));

const requiredRootScripts = ['build', 'start'];
const requiredServerScripts = ['build', 'start'];

requiredRootScripts.forEach(script => {
  if (rootPackage.scripts && rootPackage.scripts[script]) {
    console.log(`   ✅ Root script: ${script}`);
  } else {
    console.log(`   ❌ Root script missing: ${script}`);
  }
});

requiredServerScripts.forEach(script => {
  if (serverPackage.scripts && serverPackage.scripts[script]) {
    console.log(`   ✅ Server script: ${script}`);
  } else {
    console.log(`   ❌ Server script missing: ${script}`);
  }
});

// Test 3: Check Railway configuration
console.log('\n⚙️  Checking Railway configuration...');
const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));

if (railwayConfig.build && railwayConfig.build.buildCommand) {
  console.log(`   ✅ Build command: ${railwayConfig.build.buildCommand}`);
} else {
  console.log('   ❌ Build command not configured');
}

if (railwayConfig.deploy && railwayConfig.deploy.startCommand) {
  console.log(`   ✅ Start command: ${railwayConfig.deploy.startCommand}`);
} else {
  console.log('   ❌ Start command not configured');
}

if (railwayConfig.deploy && railwayConfig.deploy.healthcheckPath) {
  console.log(`   ✅ Health check: ${railwayConfig.deploy.healthcheckPath}`);
} else {
  console.log('   ❌ Health check not configured');
}

// Test 4: Test server startup
console.log('\n🔧 Testing server startup...');
console.log('   Starting server in test mode...');

// Set test environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'info';

const serverProcess = spawn('node', ['server.js'], {
  stdio: 'pipe',
  env: { ...process.env }
});

let serverOutput = '';
let healthCheckPassed = false;

serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
  console.log(`   📝 ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.log(`   ⚠️  ${data.toString().trim()}`);
});

// Wait for server to start and test health endpoint
setTimeout(async () => {
  try {
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
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
        if (res.statusCode === 200) {
          console.log('   ✅ Health check passed');
          console.log(`   📊 Response: ${data}`);
          healthCheckPassed = true;
        } else {
          console.log(`   ❌ Health check failed with status: ${res.statusCode}`);
        }
        
        // Kill server and exit
        serverProcess.kill('SIGTERM');
        
        setTimeout(() => {
          console.log('\n🎯 Test Summary:');
          console.log(`   Files: ${allFilesExist ? '✅' : '❌'}`);
          console.log(`   Health Check: ${healthCheckPassed ? '✅' : '❌'}`);
          
          if (allFilesExist && healthCheckPassed) {
            console.log('\n🎉 Railway deployment configuration looks good!');
            console.log('   You can now deploy to Railway.');
            process.exit(0);
          } else {
            console.log('\n❌ Some tests failed. Please fix the issues before deploying.');
            process.exit(1);
          }
        }, 1000);
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Health check request failed: ${err.message}`);
      serverProcess.kill('SIGTERM');
      process.exit(1);
    });

    req.on('timeout', () => {
      console.log('   ❌ Health check request timed out');
      serverProcess.kill('SIGTERM');
      process.exit(1);
    });

    req.end();
  } catch (error) {
    console.log(`   ❌ Health check error: ${error.message}`);
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }
}, 5000);

serverProcess.on('error', (error) => {
  console.log(`   ❌ Server startup error: ${error.message}`);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`   ❌ Server exited with code: ${code}`);
  }
}); 