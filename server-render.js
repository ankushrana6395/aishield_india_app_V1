#!/usr/bin/env node

/**
 * Production server for Render deployment
 * Ensures proper port binding and environment setup
 */

// Configure production environment
process.env.NODE_ENV = 'production';
console.log('🚀 Starting production server for Render...');

// Parse port from environment
const PORT = process.env.PORT || 10000;
process.env.PORT = PORT;

console.log(`📍 Port configured: ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

// Import and start the main server
require('./server.js');
