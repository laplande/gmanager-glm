/**
 * Server entry point
 * Starts the Express server and initializes the database
 */

import app from './app.js';
import config from './config.js';
import getDatabase from './db/index.js';

// Initialize database
try {
  getDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

// Start server
const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 GManager Web Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`💾 Database: ${config.dbPath}`);
  console.log(`🔐 JWT expires in: ${config.jwtExpiresIn}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('API Endpoints:');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/auth/status');
  console.log('  GET    /api/accounts');
  console.log('  POST   /api/accounts');
  console.log('  GET    /api/groups');
  console.log('  GET    /api/tags');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
