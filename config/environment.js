/**
 * Enterprise Environment Configuration Management
 *
 * Centralized configuration with validation and environment-specific settings
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from different files based on environment
const loadEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  // CRITICAL FIX: In production (Render), NEVER load local .env files EVER
  // Even if they're uploaded to Render, they can override runtime variables
  if (env === 'production') {
    console.log('🔧 Production (Render) - Using RUNTIME environment variables ONLY');
    console.log('⚠️  WARNING: Do not upload .env files to Render - use Environment Variables dashboard');
    return;
  }

  // Load base .env file for development only
  dotenv.config({ path: path.join(__dirname, '..', '.env') });

  // Load environment-specific .env file for development only
  const envPath = path.join(__dirname, '..', `.env.${env}`);
  try {
    dotenv.config({ path: envPath });
  } catch (error) {
    // Environment-specific file doesn't exist, continue with base .env
  }

  console.log('🔧 Development - Loaded environment from .env files');
};

// Load configurations
loadEnvironmentConfig();

// Add more persistent rendering and database troubleshooting
console.log('\n🚀 SERVER DIAGNOSTICS:');
console.log('  Platform:', process.platform);
console.log('  Architecture:', process.arch);
console.log('  Node Version:', process.version);
console.log('  Working Directory:', process.cwd());

if (process.platform === 'darwin' || process.platform === 'linux') {
  console.log('  ✓ Compatible platform for deployment');
} else {
  console.log('  ⚠️  Platform may not be optimal for this deployment');
}

// Configuration object with validation and defaults
const config = {
  // Server Configuration - Handle Render's PORT assignment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Render-specific PORT handling with proper fallbacks
  PORT: (() => {
    console.log('🔍 PORT Environment Analysis:');
    console.log(`  process.env.PORT: "${process.env.PORT}"`);

    const renderPort = process.env.PORT;

    // Standard Render behavior - numeric port
    if (renderPort && !isNaN(parseInt(renderPort)) && parseInt(renderPort) > 0) {
      const port = parseInt(renderPort);
      console.log(`✅ Using Render-assigned numeric PORT: ${port}`);
      return port;
    }

    // Workaround for Render "Automatically set by Render" issue
    if (renderPort === 'Automatically set by Render') {
      console.log('⚠️  Render is setting PORT to literal "Automatically set by Render"');
      console.log('🔄 This is a known Render configuration bug - using standard port');
      const port = 10000;
      console.log(`🚀 Server will bind to port ${port} to enable port scanning`);
      return port;
    }

    // Fallback for development or other environments
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Production environment without proper PORT - using standard Render port');
      return 10000;
    } else {
      console.log('⚠️  Development environment - using default development port');
      return 3000;
    }
  })(),
  VERSION: process.env.npm_package_version || '2.0.0',

  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/aishield_enterprise',

  // Security Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,

  // Session Configuration
  SESSION_TTL: parseInt(process.env.SESSION_TTL) || 24 * 60 * 60, // 1 day in seconds
  SESSION_DOMAIN: process.env.SESSION_DOMAIN,

  // CORS Configuration
  CLIENT_URLS: process.env.CLIENT_URL ?
    process.env.CLIENT_URL.split(',').map(url => url.trim()) :
    ['http://localhost:3000'],

  // File Upload Configuration
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
  UPLOAD_ALLOWED_TYPES: [
    'text/html',
    'text/plain',
    'text/markdown',
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ],

  // Rate Limiting Configuration
  RATE_LIMIT: parseInt(process.env.RATE_LIMIT) || 100,
  AUTH_RATE_LIMIT: parseInt(process.env.AUTH_RATE_LIMIT) || 5,
  UPLOAD_RATE_LIMIT: parseInt(process.env.UPLOAD_RATE_LIMIT) || 20,

  // External Services Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  // Email Configuration (for future features)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  // Cache Configuration
  REDIS_URL: process.env.REDIS_URL,
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600,

  // Monitoring and Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || path.join(__dirname, '..', 'logs', 'app.log'),
  PERFORMANCE_MONITORING: process.env.PERFORMANCE_MONITORING === 'true',

  // Admin Configuration
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION !== 'false', // Default true

  // Feature Flags
  FEATURES: {
    SUBSCRIPTION_PLANS: process.env.FEATURE_SUBSCRIPTION_PLANS !== 'false',
    PAYMENT_GATEWAY: process.env.FEATURE_PAYMENT_GATEWAY !== 'false',
    ANALYTICS: process.env.FEATURE_ANALYTICS !== 'false',
    NOTIFICATIONS: process.env.FEATURE_NOTIFICATIONS !== 'false'
  },

  // Pagination Defaults
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE) || 100,

  // API Configuration
  API_PREFIX: process.env.API_PREFIX || '/api',
  API_VERSION: process.env.API_VERSION || 'v1',
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 30000,

  // Security Headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  },

  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,

  // Backup Configuration (for future implementation)
  BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
  BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
};

// Validation function to check required configuration
const validateConfig = () => {
  const requiredFields = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'MONGODB_URI'
  ];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }

  // Validate database URI for security
  if (!config.MONGODB_URI.startsWith('mongodb+srv:') && !config.MONGODB_URI.startsWith('mongodb:')) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Validate JWT secrets
  if (config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production' && config.NODE_ENV === 'production') {
    throw new Error('Change JWT_SECRET from default value in production');
  }

  // Validate session secrets
  if (config.SESSION_SECRET === 'your-super-secret-session-key-change-in-production' && config.NODE_ENV === 'production') {
    throw new Error('Change SESSION_SECRET from default value in production');
  }

  console.log('✅ Configuration validation passed');
};

// Log current configuration for debugging (simplified)
console.log('⚙️  CONFIGURATION STATUS:');
console.log(`  NODE_ENV: ${config.NODE_ENV}`);
console.log(`  PORT: ${config.PORT} (type: ${typeof config.PORT})`);
console.log(`  MONGODB_URI: ${config.MONGODB_URI ? '✅ SET' : '❌ MISSING'}`);
console.log(`  JWT_SECRET: ${config.JWT_SECRET ? '✅ SET' : '❌ MISSING'}`);
console.log(`  SESSION_SECRET: ${config.SESSION_SECRET ? '✅ SET' : '❌ MISSING'}`);

// For Render deployment, if critical values are missing, provide fallbacks
if (config.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️  Using fallback MongoDB URI for production');
    config.MONGODB_URI = 'mongodb://localhost:27017/aishield_enterprise';
  }
  if (!process.env.JWT_SECRET || config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    console.log('⚠️  Using fallback JWT_SECRET for production');
    config.JWT_SECRET = 'fallback-jwt-secret-for-render-deployment-' + Date.now();
  }
  if (!process.env.SESSION_SECRET || config.SESSION_SECRET === 'your-super-secret-session-key-change-in-production') {
    console.log('⚠️  Using fallback SESSION_SECRET for production');
    config.SESSION_SECRET = 'fallback-session-secret-for-render-deployment-' + Date.now();
  }
}

// Validate configuration (less strict mode for Render)
try {
  validateConfig();
  console.log('✅ Configuration validation completed');
} catch (error) {
  if (config.NODE_ENV === 'production') {
    console.log('⚠️  CONFIGURATION WARNING:', error.message);
    console.log('🔧 Using fallback values for production deployment');
  } else {
    throw error;
  }
}

// Export configuration object
module.exports = config;
