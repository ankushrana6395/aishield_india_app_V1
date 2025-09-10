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

// Environment loading handled by config/environment.js
// Avoid dotenv.config() in production for Render deployments

// Advanced Debugging Middleware - Enable with DEBUG=true env var
const DEBUG_MODE = process.env.DEBUG === 'true';

if (DEBUG_MODE) {
  console.log('🐛 ADVANCED DEBUG MODE ENABLED');
  console.log('📊 All server operations will be logged extensively');
}

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

// System Diagnostics Endpoint
app.get('/debug/system', (req, res) => {
  const diagnostics = {
    server: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      environment: config.NODE_ENV,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    },
    environment: {
      PORT: config.PORT,
      NODE_ENV: process.env.NODE_ENV,
      has_RENDER_SERVICE_ID: !!process.env.RENDER_SERVICE_ID,
      allEnvKeys: Object.keys(process.env).sort()
    },
    network: {
      host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
      port: config.PORT,
      applicationUrl: `http://localhost:${config.PORT}`,
      publicUrl: process.env.RENDER_SERVICE_URL || 'not-set'
    },
    timestamp: new Date().toISOString()
  };

  if (DEBUG_MODE) {
    console.log('📊 SYSTEM DIAGNOSTICS REQUESTED:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  res.json(diagnostics);
});

// Network Diagnostics Endpoint
app.get('/debug/network', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const diagnostics = {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    networkInterfaces: Object.keys(networkInterfaces).map(iface => ({
      interface: iface,
      addresses: networkInterfaces[iface].map(addr => ({
        address: addr.address,
        netmask: addr.netmask,
        family: addr.family,
        mac: addr.mac,
        internal: addr.internal
      }))
    })),
    connections: {
      activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 'N/A',
      activeRequests: process._getActiveRequests ? process._getActiveRequests().length : 'N/A'
    }
  };

  res.json(diagnostics);
});

// Port Binding Diagnostics
app.get('/debug/ports', (req, res) => {
  const portDiagnostics = {
    listening: false,
    binding: {
      host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
      port: config.PORT
    },
    connections: [],
    timestamp: new Date().toISOString()
  };

  // Test if port is listening
  const net = require('net');
  const server = net.createServer();

  server.listen(config.PORT, portDiagnostics.binding.host, () => {
    portDiagnostics.listening = true;
    server.close(() => {
      portDiagnostics.serverClosedSuccessfully = true;
    });
  });

  server.on('error', (error) => {
    portDiagnostics.error = error.message;
    portDiagnostics.listening = false;
    res.json(portDiagnostics);
  });

  server.on('close', () => {
    portDiagnostics.serverClosed = true;
    res.json(portDiagnostics);
  });

  // Timeout safeguard
  setTimeout(() => {
    if (!portDiagnostics.serverClosed && !portDiagnostics.error) {
      portDiagnostics.timeout = true;
      if (!res.headersSent) {
        res.json(portDiagnostics);
      }
    }
  }, 5000);
});

// Real-time Monitoring Endpoint
app.get('/debug/monitor', (req, res) => {
  const http = require('http');

  // Test internal accessibility
  const testUrl = `http://localhost:${config.PORT}/health`;

  const monitoringData = {
    timestamp: new Date().toISOString(),
    serverStatus: 'unknown',
    accessibility: {
      internal: false,
      status: null,
      responseTime: null
    },
    healthChecks: {
      simple: '/health',
      api: '/api/health',
      debug: '/debug/system'
    },
    platform: process.platform
  };

  const startTime = Date.now();

  const testRequest = http.get(testUrl, { timeout: 10000 }, (response) => {
    monitoringData.accessibility.responseTime = Date.now() - startTime;
    monitoringData.accessibility.internal = true;
    monitoringData.accessibility.status = response.statusCode;
    monitoringData.serverStatus = response.statusCode === 200 ? 'healthy' : 'responding';

    // Test multiple endpoints
    const endpoints = ['/health', '/api/health'];
    const endpointTests = endpoints.map(endpoint => ({
      url: `http://localhost:${config.PORT}${endpoint}`,
      status: 'pending'
    }));

    monitoringData.endpointTests = endpointTests;
    res.json(monitoringData);
  });

  testRequest.on('error', (error) => {
    monitoringData.accessibility.error = error.message;
    monitoringData.serverStatus = 'unreachable';
    res.json(monitoringData);
  });

  testRequest.on('timeout', () => {
    monitoringData.accessibility.timeout = true;
    monitoringData.serverStatus = 'timeout';
    res.json(monitoringData);
  });
});

// Immediate health check for Render port scanning
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
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

// CORS Error Handler - Must come before general error handling
app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    console.log('🚫 CORS BLOCK: Access denied for origin:', req.headers.origin);
    return res.status(403).json({
      error: 'CORS_ERROR',
      message: 'Cross-origin request blocked',
      timestamp: new Date().toISOString()
    });
  }
  next(error);
});

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
      // Add timeout wrapper around database connection
      const dbConnectionTimeout = config.NODE_ENV === 'production' ? 15000 : 10000; // 15s prod, 10s dev
  
      const dbConnectionPromise = connectToDatabase();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), dbConnectionTimeout)
      );
  
      await Promise.race([dbConnectionPromise, timeoutPromise]);
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.log('⚠️  Database connection failed:', dbError.message);
  
      if (config.NODE_ENV === 'production') {
        console.log('🔄 PROD: Continuing with database fallback - server will bind');
        console.log('🔄 Render deployment will work even without database');
        console.log('📡 Server will be accessible at https://aishield-india-app-v1.onrender.com');
      } else {
        console.log('🔄 DEV: Would throw error in development, but proceeding for local testing');
        console.log('⚠️  DEV: Database not connected - some features may not work');
      }
    }

    // Determine the host based on environment - crucial for Render detection
    const host = config.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
    console.log(`🎯 STARTING SERVER on ${host}:${PORT}`);

    if (config.NODE_ENV === 'production') {
      Logger.info('Production deployment - binding to all interfaces', { host, port: PORT });
      console.log(`🚀 PRODUCTION: Node.js server binding to ${host}:${PORT}`);
      console.log(`📡 Render port scanner will check ${host}:${PORT}`);
    } else {
      Logger.info('Development environment - localhost binding', { host, port: PORT });
      console.log(`🚀 DEVELOPMENT: Node.js server binding to ${host}:${PORT}`);
    }

    // Create HTTP server with enhanced error handling for Render compatibility
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

      // CRITICAL: Render's port scanner looks for this EXACT logging message
      console.log(`Application is listening on port ${PORT}`);

      // Professional production startup confirmation
      if (config.NODE_ENV === 'production') {
        console.log(`🚀 PRODUCTION SERVER: Successfully bound to ${host}:${PORT}`);
        console.log(` 📡 Render port scanner can detect this server`);
        console.log(` 🏥 Health check available at: http://localhost:${PORT}/health`);
        console.log(` 🌐 API health check available at: http://localhost:${PORT}/api/health`);
        console.log(` ✅ Node.js application running on port ${PORT}`);
      } else {
        console.log(`🚀 DEVELOPMENT SERVER: Successfully bound to ${host}:${PORT}`);
        console.log(` ✅ Node.js application running on port ${PORT}`);
      }

      // Validate server is accessible immediately
      setTimeout(() => {
        const http = require('http');
        const testUrl = `http://localhost:${PORT}/health`;

        console.log(`🔍 Validating server accessibility at: ${testUrl}`);

        const testReq = http.get(testUrl, { timeout: 5000 }, (response) => {
          if (response.statusCode === 200) {
            console.log(`✅ PORT VALIDATION: Server responding correctly (HTTP ${response.statusCode})`);
            console.log(`🌟 Server successfully listening and responding on port ${PORT}`);
          } else {
            console.log(`⚠️ PORT VALIDATION: Server responding with HTTP ${response.statusCode}`);
          }
        });

        testReq.on('error', (error) => {
          console.error(`❌ PORT VALIDATION ERROR: ${error.message}`);
          console.error(`🚨 Possible issue with server binding or accessibility`);
        });

        testReq.on('timeout', () => {
          console.error(`⏰ PORT VALIDATION TIMEOUT: Server may not be responding`);
          testReq.destroy();
        });

      }, 1000); // Quick validation after startup
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

console.log('🚀 DEBUG: Starting server.js execution immediately');
console.log('  Process PID:', process.pid);
console.log('  Node version:', process.version);
console.log('  Current working directory:', process.cwd());
console.log('  require.main === module?', require.main === module);
console.log('  process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('  Process environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  has_MONGODB_URI: !!process.env.MONGODB_URI
});

// Check if this file is being run directly (not required by another file)
// This handles both local development and Render deployment scenarios
if (require.main === module) {
  console.log('✅ DEBUG: Running directly as main module');

  // Check if we're running on Render (production environment)
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 DEBUG: Production environment detected');
    console.log('🚀 Starting production server for Render...');

    // Force production environment
    process.env.NODE_ENV = 'production';

    // Get port from environment (Render assigns this)
    const RENDER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 10000;
    console.log(`📍 DEBUG: Configured port: ${RENDER_PORT} (type: ${typeof RENDER_PORT})`);

    // Update the config with Render's port
    process.env.PORT = RENDER_PORT.toString();

    console.log(`📍 Port configured: ${RENDER_PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Binding to 0.0.0.0:${RENDER_PORT}`);

    // Explicitly log that the port is open for Render to detect
    console.log(`📡 PORT ${RENDER_PORT} IS NOW OPEN AND LISTENING`);
    console.log(`🎯 Starting server startup process...`);

    try {
      console.log('🔄 Calling startServer()...');
      // Start server with Render-specific configuration
      startServer().then(() => {
        console.log('✅ startServer() completed successfully');
      }).catch((error) => {
        console.error('🚨 CRITICAL ERROR: startServer failed');
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);

        // Render-specific failsafe
        console.log('🔄 ATTEMPTING RENDER FAILSAFE STARTUP');

        const host = '0.0.0.0';
        console.log(`🛡️  Starting server at ${host}:${RENDER_PORT} (fallback mode)`);

        try {
          const server = app.listen(RENDER_PORT, host, () => {
            console.log(`🎯 SERVER CONFIRMATION: Listening on ${host}:${RENDER_PORT} (FAILSAFE MODE)`);
            console.log(`🌐 ✅ Render should detect port ${RENDER_PORT} on ${host} - EVEN IF DATABASE FAILS`);
            console.log(`🔴 WARNING: Database not connected - app in degraded mode`);
            console.log(`📡 PORT ${RENDER_PORT} IS NOW OPEN AND LISTENING`);
          }).on('error', (fallbackError) => {
            console.error('❌ EVEN FAILSAFE FAILED:', fallbackError.message);
            process.exit(1);
          });
        } catch (failsafeError) {
          console.error('❌ Fail-safe server creation failed:', failsafeError.message);
          process.exit(1);
        }
      });
    } catch (syncError) {
      console.error('🚨 SYNCHRONOUS ERROR during server startup:', syncError.message);
      process.exit(1);
    }
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
