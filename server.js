#!/usr/bin/env node

// Railway deployment entry point for Crypto Intelligence Engine
// This file starts the compiled server with proper error handling

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');

// Environment setup
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5001;
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;

console.log('🚀 Starting Crypto Intelligence Engine on port', PORT);
console.log('🔍 Environment Check:');
console.log('   NODE_ENV:', NODE_ENV);
console.log('   PORT:', PORT);
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set (will use SQLite)');
console.log('   CORS_ORIGIN:', process.env.CORS_ORIGIN || 'Not set');
console.log('   Railway Environment:', IS_RAILWAY ? 'Yes' : 'No');

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

// Set environment variables for the server
process.env.PORT = PORT.toString();

// Health check server (always available)
const createHealthServer = () => {
  const healthServer = http.createServer((req, res) => {
    const url = req.url;
    
    if (url === '/health' || url === '/') {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        port: PORT,
        railway: !!IS_RAILWAY,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  healthServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Health check server listening on port ${PORT}`);
    console.log(`🔗 Health endpoint: http://0.0.0.0:${PORT}/health`);
  });

  return healthServer;
};

// Start health server immediately
const healthServer = createHealthServer();

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  
  if (healthServer) {
    healthServer.close(() => {
      console.log('✅ Health server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Check if compiled server exists
const serverPath = path.join(__dirname, 'server', 'dist', 'index.js');
const hasCompiledServer = fs.existsSync(serverPath);

if (hasCompiledServer) {
  console.log('✅ Starting compiled server...');
  
  try {
    // Close health server before starting main server
    healthServer.close(() => {
      console.log('🔄 Transitioning from health server to main server...');
      
      // Start the main compiled server
      require(serverPath);
    });
  } catch (error) {
    console.error('❌ Failed to start compiled server:', error);
    
    // Keep health server running as fallback
    console.log('🔄 Keeping health check server running as fallback...');
    console.log('📋 Available endpoints:');
    console.log(`   GET http://0.0.0.0:${PORT}/health - Health check`);
    console.log(`   GET http://0.0.0.0:${PORT}/ - Basic status`);
  }
} else {
  console.log('⚠️  Compiled server not found at:', serverPath);
  console.log('🔄 Running health check server only...');
  console.log('📋 Available endpoints:');
  console.log(`   GET http://0.0.0.0:${PORT}/health - Health check`);
  console.log(`   GET http://0.0.0.0:${PORT}/ - Basic status`);
  
  if (IS_RAILWAY) {
    console.log('🚨 Railway deployment detected but server not built!');
    console.log('💡 Make sure to run: npm run build');
  }
}

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit, keep health server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, keep health server running
}); 