#!/usr/bin/env node

/**
 * Production server for Render deployment
 * Ensures proper port binding and environment setup
 */

console.log('🚀 Starting production server for Render...');

// Force production environment
process.env.NODE_ENV = 'production';

// Get port from environment (Render assigns this)
const PORT = parseInt(process.env.PORT) || 10000;

// Ensure port is set for config
process.env.PORT = PORT;

console.log(`📍 Port configured: ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 Binding to 0.0.0.0:${PORT}`);

// Import the main server application and database functions
const app = require('./server.js');

// Import the database connection logic from server.js
// We need to re-import the functions since the app export doesn't include them
const mongoose = require('mongoose').set('strictQuery', true);
const Logger = require('./utils/logger');
const config = require('./config/environment');

// Database connection with retry logic
async function connectToDatabase() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      Logger.info(`Attempting database connection (${retries + 1}/${maxRetries})`);

      await mongoose.connect(config.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });

      Logger.info('Successfully connected to MongoDB', {
        database: mongoose.connection.db.databaseName,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
      });

      // Set up database event listeners
      setupDatabaseListeners();
      return;
    } catch (error) {
      retries++;
      Logger.error(`Database connection attempt ${retries} failed`, {
        error: error.message,
        stack: error.stack ? error.stack.substring(0, 200) : undefined
      });

      if (retries >= maxRetries) {
        Logger.error('Max database connection retries exceeded');
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      Logger.info(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function setupDatabaseListeners() {
  mongoose.connection.on('error', (err) => {
    Logger.error('Database connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    Logger.warn('Database disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    Logger.info('Database reconnected');
  });
}

// Start server after database connection
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();

    // Create HTTP server and bind to correct interface
    const http = require('http');
    const server = http.createServer(app);

    // Bind to 0.0.0.0 (required for Render)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
      console.log(`🌐 Application ready for Render deployment`);
      console.log(`🔗 Health check: http://0.0.0.0:${PORT}/api/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the application
startServer();
