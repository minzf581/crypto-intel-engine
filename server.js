#!/usr/bin/env node

// Railway deployment entry point for Crypto Intelligence Engine
const path = require('path');
const fs = require('fs');

// Environment setup
const NODE_ENV = process.env.NODE_ENV || 'production';
const PORT = parseInt(process.env.PORT || '5001', 10);
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Starting Crypto Intelligence Engine');
console.log('   Environment:', NODE_ENV);
console.log('   Port:', PORT);
console.log('   Host:', HOST);
console.log('   Railway:', process.env.RAILWAY_ENVIRONMENT ? 'Yes' : 'No');

// Ensure required directories exist
const requiredDirs = [
  path.join(__dirname, 'server/data'),
  path.join(__dirname, 'logs')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`📁 Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Check if compiled server exists
const serverPath = path.join(__dirname, 'server', 'dist', 'index.js');
const hasCompiledServer = fs.existsSync(serverPath);

if (hasCompiledServer) {
  console.log('✅ Starting compiled server...');
  
  // Set environment variables
  process.env.PORT = PORT.toString();
  process.env.HOST = HOST;
  process.env.NODE_ENV = NODE_ENV;
  
  try {
    // Start the main compiled server
    require(serverPath);
  } catch (error) {
    console.error('❌ Failed to start compiled server:', error);
    process.exit(1);
  }
} else {
  console.error('❌ Compiled server not found at:', serverPath);
  console.error('💡 Make sure to run: npm run build');
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
}); 