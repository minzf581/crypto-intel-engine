#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Railway Deployment Test');
console.log('==========================\n');

const tests = [
  {
    name: 'Check Node.js version',
    test: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      if (major >= 18) {
        return { success: true, message: `Node.js ${version} ✅` };
      } else {
        return { success: false, message: `Node.js ${version} - Need >= 18` };
      }
    }
  },
  {
    name: 'Check package.json',
    test: () => {
      const exists = fs.existsSync('package.json');
      if (exists) {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        return { success: true, message: `Found package.json v${pkg.version}` };
      }
      return { success: false, message: 'package.json not found' };
    }
  },
  {
    name: 'Check server package.json',
    test: () => {
      const exists = fs.existsSync('server/package.json');
      if (exists) {
        const pkg = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
        return { success: true, message: `Found server/package.json v${pkg.version}` };
      }
      return { success: false, message: 'server/package.json not found' };
    }
  },
  {
    name: 'Check client package.json',
    test: () => {
      const exists = fs.existsSync('client/package.json');
      if (exists) {
        const pkg = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
        return { success: true, message: `Found client/package.json v${pkg.version}` };
      }
      return { success: false, message: 'client/package.json not found' };
    }
  },
  {
    name: 'Check Railway config',
    test: () => {
      const railwayToml = fs.existsSync('railway.toml');
      const nixpacks = fs.existsSync('nixpacks.toml');
      if (railwayToml && nixpacks) {
        return { success: true, message: 'Railway configs found' };
      }
      return { success: false, message: 'Missing Railway config files' };
    }
  },
  {
    name: 'Test build process',
    test: () => {
      try {
        console.log('   📦 Installing dependencies...');
        execSync('npm run install:deps', { stdio: 'pipe' });
        
        console.log('   🔨 Building server...');
        execSync('npm run build:server', { stdio: 'pipe' });
        
        console.log('   🎨 Building client...');
        execSync('npm run build:client', { stdio: 'pipe' });
        
        return { success: true, message: 'Build completed successfully' };
      } catch (error) {
        return { success: false, message: `Build failed: ${error.message}` };
      }
    }
  },
  {
    name: 'Verify build artifacts',
    test: () => {
      const serverDist = fs.existsSync('server/dist/index.js');
      const clientDist = fs.existsSync('client/dist/index.html');
      
      if (serverDist && clientDist) {
        const serverSize = fs.statSync('server/dist/index.js').size;
        const clientSize = fs.statSync('client/dist/index.html').size;
        return { 
          success: true, 
          message: `Server: ${(serverSize/1024).toFixed(1)}KB, Client: ${(clientSize/1024).toFixed(1)}KB` 
        };
      }
      return { success: false, message: 'Build artifacts missing' };
    }
  },
  {
    name: 'Test server startup',
    test: () => {
      try {
        // Test if server can start without errors
        const testPort = 3999;
        process.env.PORT = testPort;
        process.env.NODE_ENV = 'production';
        
        console.log('   🚀 Testing server startup...');
        
        // Start server in background
        const { spawn } = require('child_process');
        const serverProcess = spawn('node', ['server.js'], {
          env: { ...process.env, PORT: testPort },
          stdio: 'pipe'
        });
        
        return new Promise((resolve) => {
          let output = '';
          let resolved = false;
          
          serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('Health check server listening') && !resolved) {
              resolved = true;
              serverProcess.kill();
              resolve({ success: true, message: 'Server started successfully' });
            }
          });
          
          serverProcess.stderr.on('data', (data) => {
            if (!resolved) {
              resolved = true;
              serverProcess.kill();
              resolve({ success: false, message: `Server error: ${data.toString()}` });
            }
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              serverProcess.kill();
              resolve({ success: false, message: 'Server startup timeout' });
            }
          }, 10000);
        });
      } catch (error) {
        return { success: false, message: `Startup test failed: ${error.message}` };
      }
    }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    process.stdout.write(`📋 ${test.name}... `);
    
    try {
      const result = await test.test();
      if (result.success) {
        console.log(`✅ ${result.message}`);
        passed++;
      } else {
        console.log(`❌ ${result.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Ready for Railway deployment.');
    console.log('\n🚀 Next steps:');
    console.log('   1. git add .');
    console.log('   2. git commit -m "Railway deployment ready"');
    console.log('   3. git push origin main');
    console.log('   4. Deploy on Railway');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please fix issues before deploying.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 