// Railway deployment entry point for Crypto Intelligence Engine
// This file starts the compiled server with proper error handling

const path = require('path');
const fs = require('fs');

// Use Railway's PORT environment variable
const PORT = process.env.PORT || 5001;
console.log(`🚀 Starting Crypto Intelligence Engine on port ${PORT}`);

// Environment validation
console.log('🔍 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   PORT: ${PORT}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set (will use SQLite)'}`);
console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'Not set'}`);

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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Check if compiled server exists
const serverPath = path.join(__dirname, 'server/dist/index.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Compiled server not found at:', serverPath);
  console.error('   Please run "npm run build" first');
  process.exit(1);
}

console.log('✅ Starting compiled server...');

// Start the server
try {
  require('./server/dist/index.js');
  console.log('🎉 Server initialization completed');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
} 