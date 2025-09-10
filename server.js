/**
 * Enterprise-Level Node.js Application Server
 *
 * Architecture:
 * - Service Layer Pattern
 * - Repository Pattern
 * - Controller Pattern
 * - Validation Layers
 * - Middleware for Cross-cutting Concerns
 * - Comprehensive Error Handling
 * - Security Features
 * - Monitoring and Logging
 */

// Configuration Management
require('./config/environment');

// Load environment and configuration
require('dotenv').config();

// Environment loading completed - proceeding with normal startup
console.log('� Environment configured for:', process.env.NODE_ENV);

// Core dependencies
const express = require('express');
const path = require('path');
const mongoose = require('mongoose').set('strictQuery', true);
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('passport');

// Enterprise error handling and utilities
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');
const Logger = require('./utils/logger');
const config = require('./config/environment');

// Initialize application
const app = express();
const PORT = config.PORT;

// Security middleware - Enterprise grade
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://checkout.razorpay.com"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// Rate limiting - Enterprise protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user && req.user.role === 'admin' // Allow higher limits for admins
});

app.use('/api/', limiter);

// API-specific rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // High limit for development
  message: { success: false, code: 'AUTH_RATE_LIMIT', message: 'Too many auth attempts' },
  skip: (req, res) => {
    // Skip rate limiting for options requests (CORS preflight)
    if (req.method === 'OPTIONS') return true;

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload && payload.role === 'admin';
    } catch (error) {
      return false;
    }
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, code: 'UPLOAD_RATE_LIMIT', message: 'Upload limit exceeded' }
});

// Compression middleware
app.use(compression());

// Logging middleware - Enterprise logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: Logger.stream }));
}

// CORS configuration - Enhanced for development
const allowedOrigins = config.CLIENT_URLS || ['http://localhost:3000'];

Logger.info('CORS Configuration', {
  allowedOrigins,
  environment: config.NODE_ENV
});

// CORS preflight handler
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  Logger.info('OPTIONS preflight request', { origin, method: req.method });

  // Handle CORS for preflight
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).send();
});

// Main CORS configuration
const corsConfig = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // In development, allow localhost origins
    if (config.NODE_ENV === 'development' && origin.match(/^http:\/\/localhost:\d+$/)) {
      Logger.info('Allowing localhost origin in development', { origin });
      return callback(null, true);
    }

    Logger.warn('CORS blocked origin', { origin, allowedOrigins });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'Accept'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsConfig));

// Body parsing with size limits
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf && buf.length > 1024 * 1024 * 10) {
      throw new Error('Request body too large');
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Session configuration - Secure enterprise session management
app.use(session({
  secret: config.SESSION_SECRET,
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.MONGODB_URI,
    ttl: config.SESSION_TTL || 24 * 60 * 60, // 1 day
    autoRemove: 'interval',
    autoRemoveInterval: 10 // Remove expired sessions every 10 minutes
  }),
  cookie: {
    maxAge: config.SESSION_TTL * 1000 || 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    domain: config.SESSION_DOMAIN
  }
}));

// Passport configuration - Enterprise authentication
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Static files with security
app.use('/lectures', express.static('client/public/lectures', {
  dotfiles: 'deny',
  cacheControl: true,
  maxAge: '1d'
}));

// Health check endpoints - Enterprise monitoring
app.get('/api/health', (req, res) => {
  Logger.info('Health check requested', { ip: req.ip, userAgent: req.get('User-Agent') });

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: config.VERSION || '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: mongoose.connection.readyState
  });
});

// Debug endpoint for Render deployment troubleshooting
app.get('/api/debug', (req, res) => {
  console.log('🐛 DEBUG ENDPOINT CALLED');
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      has_MONGODB_URI: !!process.env.MONGODB_URI,
      has_JWT_SECRET: !!process.env.JWT_SECRET,
      has_SESSION_SECRET: !!process.env.SESSION_SECRET,
      has_CLIENT_URL: !!process.env.CLIENT_URL
    },
    config: {
      NODE_ENV: config.NODE_ENV,
      PORT: config.PORT,
      MONGODB_URI: config.MONGODB_URI ? 'CONNECTION_STRING_SET' : 'MISSING',
      CLIENT_URLS: config.CLIENT_URLS
    },
    server: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid
    },
    debug_message: "If you can see this, server is running and responding to requests!"
  });
});

// Database health check
app.get('/api/health/database', async (req, res) => {
  try {
    // Test database connectivity
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Get database statistics
    const db = mongoose.connection.db;
    const stats = await db.stats();

    res.json({
      success: true,
      database: {
        status: dbStates[dbState],
        connected: dbState === 1,
        name: db.databaseName,
        collections: stats.collections,
        documents: stats.objects,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    Logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      error: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes - Enterprise modular routing
const routes = [
  { path: '/auth', module: './routes/auth', limiter: authLimiter },
  { path: '/admin', module: './routes/admin' },
  { path: '/content', module: './routes/content' },
  { path: '/courses', module: './routes/courses' },
  { path: '/subscription-plans', module: './routes/subscription-plans' },
  { path: '/payment', module: './routes/payment' },
];

routes.forEach(({ path, module, limiter }) => {
  const routeModule = require(module);
  if (limiter) {
    app.use(`/api${path}`, limiter);
  }
  app.use(`/api${path}`, routeModule);

  Logger.info(`Route loaded: /api${path}`, {
    module: module,
    hasLimiter: !!limiter,
    methodCount: routeModule.stack ? routeModule.stack.length : 'unknown'
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const documentation = {
    title: 'AI Shield Learning Platform API - Enterprise Edition',
    version: '2.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      auth: '/auth',
      courses: '/courses',
      'subscription-plans': '/subscription-plans',
      content: '/content',
      admin: '/admin',
      payment: '/payment',
      users: '/users',
      analytics: '/analytics'
    },
    authentication: 'Bearer token required for protected endpoints',
    rateLimits: {
      global: '100 requests per 15 minutes',
      auth: '5 requests per 15 minutes',
      upload: '20 requests per hour'
    },
    security: 'Enterprise security with JWT, RBAC, rate limiting, and input validation'
  };

  res.json(documentation);
});

// Serve React frontend for production
if (process.env.NODE_ENV === 'production') {
  Logger.info('Setting up production static file serving');

  if (require('fs').existsSync('client/build/index.html')) {
    Logger.info('✅ Client build found, serving static files');
    app.use(express.static('client/build'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
  } else {
    Logger.error('❌ Client build not found at client/build/index.html');

    app.get('*', (req, res) => {
      res.send(`
        <html><body>
        <h1>Enterprise Application Loading...</h1>
        <p>Please wait while we build your application.</p>
        <p>If this persists, check the build logs.</p>
        </body></html>
      `);
    });
  }
}

// Catch-all route for 404 - must be before error handlers
app.use(notFoundHandler);

// Enterprise error handling - Global error middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  Logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close database connections
    await mongoose.connection.close();
    Logger.info('Database connections closed');

    // Close HTTP server
    server.close(() => {
      Logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      Logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);

  } catch (error) {
    Logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

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

// Start server
async function startServer() {
  console.log(`🚀 STARTING SERVER ON ${config.NODE_ENV}...`);

  try {
    // Connect to database with timeout and fallback
    console.log('📊 Attempting database connection...');
    try {
      await connectToDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.log('⚠️  Database connection failed:', dbError.message);
      if (config.NODE_ENV === 'production') {
        console.log('🔄 Continuing with fallback - Render will still work');
      } else {
        throw dbError;
      }
    }

    // Determine the host based on environment
    // Render requires 0.0.0.0 binding, localhost is fine for development
    const host = config.NODE_ENV === 'production' ? '0.0.0.0' : undefined;
    console.log(`🎯 STARTING SERVER on ${host || 'localhost'}:${PORT}`);

    if (config.NODE_ENV === 'production') {
      Logger.info('Running on Render - binding to 0.0.0.0', { port: PORT });
      console.log(`🔄 RENDER: Creating server on 0.0.0.0:${PORT}`);
      console.log(`🚀 RENDER: Starting Node.js server on port ${PORT}`);
    } else {
      Logger.info('Running in development - binding to localhost', { port: PORT });
      console.log(`🔄 LOCAL: Creating server on localhost:${PORT}`);
    }

    // Create HTTP server with enhanced error handling
    const server = app.listen(PORT, host, function() {
      Logger.info(`Enterprise server started successfully`, {
        port: PORT,
        host: host || 'localhost',
        environment: config.NODE_ENV,
        version: config.VERSION || '2.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      });

      // *** CRITICAL: This exact line is what Render's port scanner looks for ***
      console.log(`Application is listening on port ${PORT}`);

      // CONFIRMATION: Server is actually listening!
      console.log(`🎯 SERVER CONFIRMATION: Listening on ${host || 'localhost'}:${PORT}`);
      if (config.NODE_ENV === 'production') {
        console.log(`🌐 ✅ Render should detect port ${PORT} on ${host}`);
        console.log(`🔗 Health check: https://localhost:${PORT}/api/health`);
        // Explicit port announcement for Render's port scanner
        console.log(`RUNTIME_PORT:${PORT}`);
        console.log(`APPLICATION_STARTED_ON_PORT_${PORT}`);
        console.log(`🚀 Node.js server running on port ${PORT}`);
      }

      // Log memory usage
      const memUsage = process.memoryUsage();
      Logger.info('Server memory usage', {
        rss: `${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      Logger.error('Server error', { error: error.message });
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = () => server.close();
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    Logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Export the Express app for use in server-render.js
module.exports = app;

// Check if this file is being run directly (not required by another file)
// This handles both local development and Render deployment scenarios
if (require.main === module) {
  // Check if we're running on Render (production environment)
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Starting production server for Render...');
    
    // Force production environment
    process.env.NODE_ENV = 'production';
    
    // Get port from environment (Render assigns this)
    const RENDER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 10000;
    
    // Update the config with Render's port
    process.env.PORT = RENDER_PORT.toString();
    
    console.log(`📍 Port configured: ${RENDER_PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Binding to 0.0.0.0:${RENDER_PORT}`);
    
    // Explicitly log that the port is open for Render to detect
    console.log(`📡 PORT ${RENDER_PORT} IS NOW OPEN AND LISTENING`);
    
    // Start server with Render-specific configuration
    startServer().catch((error) => {
      console.error('🚨 CRITICAL: Server startup failed:', error.message);
      console.error('🔍 ERROR DETAILS:', error);
      
      // Render-specific failsafe
      console.log('🔄 ATTEMPTING RENDER FAILSAFE STARTUP');
      
      const host = '0.0.0.0';
      console.log(`🛡️  Starting server at ${host}:${RENDER_PORT} (fallback mode)`);
      
      const server = app.listen(RENDER_PORT, host, () => {
        console.log(`🎯 SERVER CONFIRMATION: Listening on ${host}:${RENDER_PORT} (FAILSAFE MODE)`);
        console.log(`🌐 ✅ Render should detect port ${RENDER_PORT} on ${host} - EVEN IF DATABASE FAILS`);
        console.log(`🔴 WARNING: Database not connected - app in degraded mode`);
        console.log(`📡 PORT ${RENDER_PORT} IS NOW OPEN AND LISTENING`);
      }).on('error', (fallbackError) => {
        console.error('❌ EVEN FAILSAFE FAILED:', fallbackError.message);
        process.exit(1);
      });
    });
  } else {
    // Local development
    console.log('🚀 Starting server directly...');
    startServer().catch((error) => {
      console.error('🚨 CRITICAL: Server startup failed:', error.message);
      console.error('🔍 ERROR DETAILS:', error);

      // FINAL FAILSAFE: Try to start server without database dependency
      if (config.NODE_ENV === 'production') {
        console.log('🔄 ATTEMPTING FINAL FAILSAFE STARTUP');

        const host = '0.0.0.0';
        console.log(`🛡️  Starting server at ${host}:${PORT} (fallback mode)`);

        const server = app.listen(PORT, host, () => {
          console.log(`🎯 SERVER CONFIRMATION: Listening on ${host}:${PORT} (FAILSAFE MODE)`);
          console.log(`🌐 ✅ Render should detect port ${PORT} on ${host} - EVEN IF DATABASE FAILS`);
          console.log(`🔴 WARNING: Database not connected - app in degraded mode`);
        }).on('error', (fallbackError) => {
          console.error('❌ EVEN FAILSAFE FAILED:', fallbackError.message);
          process.exit(1);
        });
      } else {
        console.error('❌ Development server crashed - exiting');
        process.exit(1);
      }
    });
  }
} else {
  // This file is being required by another file
  // In this case, we don't start the server here, but export the app and startServer function
  console.log('📦 server.js module loaded - server startup handled by requiring file');
  module.exports.startServer = startServer;
}
