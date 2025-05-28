#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Railway Deployment Readiness Check');
console.log('=====================================\n');

// Quick checks
const checks = [
  {
    name: 'Server build exists',
    check: () => fs.existsSync('server/dist/index.js'),
    fix: 'Run: npm run build:server'
  },
  {
    name: 'Client build exists', 
    check: () => fs.existsSync('client/dist/index.html'),
    fix: 'Run: npm run build:client'
  },
  {
    name: 'Railway config exists',
    check: () => fs.existsSync('railway.toml') && fs.existsSync('nixpacks.toml'),
    fix: 'Railway config files missing'
  },
  {
    name: 'Server.js exists',
    check: () => fs.existsSync('server.js'),
    fix: 'server.js missing'
  },
  {
    name: 'Package.json has start script',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts && pkg.scripts.start;
    },
    fix: 'Add start script to package.json'
  }
];

let allPassed = true;

checks.forEach(check => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   💡 Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(40));

if (allPassed) {
  console.log('🎉 Ready for Railway deployment!');
  console.log('\n🚀 Deploy steps:');
  console.log('   1. git add .');
  console.log('   2. git commit -m "Railway deployment ready"');
  console.log('   3. git push origin main');
  console.log('   4. Railway will auto-deploy');
  
  console.log('\n📋 Health check endpoint: /health');
  console.log('📋 Expected response: {"status":"healthy",...}');
} else {
  console.log('❌ Not ready for deployment');
  console.log('   Please fix the issues above first');
}

console.log(''); 