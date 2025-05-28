#!/usr/bin/env node

// Railway-specific startup script
const path = require('path');
const fs = require('fs');

console.log('🚀 Railway Startup - Crypto Intelligence Engine');

// Environment setup
const PORT = parseInt(process.env.PORT || '5001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`   Port: ${PORT}`);
console.log(`   Host: ${HOST}`);
console.log(`   Environment: ${NODE_ENV}`);

// Set environment variables
process.env.PORT = PORT.toString();
process.env.HOST = HOST;
process.env.NODE_ENV = NODE_ENV;

// Check if compiled server exists
const serverPath = path.join(__dirname, 'server', 'dist', 'index.js');

if (!fs.existsSync(serverPath)) {
  console.error('❌ Compiled server not found at:', serverPath);
  console.error('💡 Build may have failed');
  process.exit(1);
}

console.log('✅ Starting compiled server...');

// Start the server
try {
  require(serverPath);
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
} 