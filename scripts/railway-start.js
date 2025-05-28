#!/usr/bin/env node

/**
 * Railway-optimized startup script
 * Ensures fast server startup for health checks
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Crypto Intelligence Engine for Railway...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || '5001');

// Set Railway-specific environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Start the server
const serverPath = path.join(__dirname, '../server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Ensure Railway port is used
    PORT: process.env.PORT || '5001',
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully...');
  server.kill('SIGINT');
}); 