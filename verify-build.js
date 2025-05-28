#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Railway Build Verification Script');
console.log('====================================');

const checks = [
  {
    name: 'Server compiled',
    path: 'server/dist/index.js',
    required: true
  },
  {
    name: 'Client built',
    path: 'client/dist/index.html',
    required: true
  },
  {
    name: 'Server package.json',
    path: 'server/package.json',
    required: true
  },
  {
    name: 'Client package.json',
    path: 'client/package.json',
    required: true
  },
  {
    name: 'Root package.json',
    path: 'package.json',
    required: true
  },
  {
    name: 'Main server.js',
    path: 'server.js',
    required: true
  }
];

let allPassed = true;

console.log('\n📋 Checking build artifacts...\n');

checks.forEach(check => {
  const fullPath = path.join(__dirname, check.path);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = stats.isFile() ? ` (${(stats.size / 1024).toFixed(1)}KB)` : ' (directory)';
    console.log(`✅ ${check.name}: Found${size}`);
  } else {
    console.log(`❌ ${check.name}: Missing at ${check.path}`);
    if (check.required) {
      allPassed = false;
    }
  }
});

// Check Node modules
const serverNodeModules = fs.existsSync(path.join(__dirname, 'server/node_modules'));
const clientNodeModules = fs.existsSync(path.join(__dirname, 'client/node_modules'));

console.log(`\n📦 Dependencies:`);
console.log(`   Server node_modules: ${serverNodeModules ? '✅' : '❌'}`);
console.log(`   Client node_modules: ${clientNodeModules ? '✅' : '❌'}`);

// Environment check
console.log(`\n🌍 Environment:`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Node version: ${process.version}`);

if (allPassed) {
  console.log('\n🎉 All required build artifacts found!');
  console.log('✅ Ready for Railway deployment');
  process.exit(0);
} else {
  console.log('\n❌ Build verification failed!');
  console.log('🔧 Please run: npm run build');
  process.exit(1);
} 