/**
 * Enterprise Logging System
 *
 * Advanced logging with multiple levels, structured logs, rotation, and monitoring
 */

const winston = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config/environment');

// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  performance: 5,
  security: 6
};

// Custom colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  performance: 'cyan',
  security: 'red bold'
};

winston.addColors(logColors);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Common log format
const commonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ?
      `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// File format for production
const fileFormat = winston.format.combine(
  commonFormat,
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    }, null, 2);
  })
);

// Create rotating file transports
const createFileTransport = (filename, level = 'info') => {
  return new DailyRotateFile({
    filename: path.join(logsDir, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    level: level,
    format: fileFormat,
    utc: true,
    handleExceptions: true,
    handleRejections: true
  });
};

// Create winston logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  levels: logLevels,
  format: commonFormat,
  defaultMeta: {
    service: 'ai-shield-learning',
    environment: config.NODE_ENV,
    version: config.VERSION
  },
  transports: [
    // Error logs
    createFileTransport('error', 'error'),

    // Combined logs (all levels)
    createFileTransport('combined'),

    // Security logs
    createFileTransport('security', 'security'),

    // Performance logs
    createFileTransport('performance', 'performance')
  ],
  exitOnError: false
});

// Add console transport for development
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug',
    handleExceptions: true,
    handleRejections: true
  }));
}

// Create stream for morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

/**
 * Enhanced Logging Methods
 */

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log incoming request
  logger.http('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : undefined,
    timestamp: new Date().toISOString()
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' :
                     res.statusCode >= 400 ? 'warn' : 'http';

    logger.log(logLevel, 'Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user ? req.user._id : undefined
    });
  });

  next();
};

// Database operation logger
const databaseLogger = (operation, collection, duration, success = true) => {
  const logData = {
    operation,
    collection,
    duration: `${duration}ms`,
    success
  };

  if (success) {
    logger.info('Database operation completed', logData);
  } else {
    logger.warn('Database operation failed', logData);
  }
};

// Cache operation logger
const cacheLogger = (operation, key, duration, hit = true) => {
  const logData = {
    operation,
    key: key.substring(0, 50), // Truncate long keys
    duration: `${duration}ms`,
    hit
  };

  if (operation === 'get') {
    if (hit) {
      logger.debug('Cache hit', logData);
    } else {
      logger.debug('Cache miss', logData);
    }
  } else {
    logger.debug('Cache operation', logData);
  }
};

// Authentication logger
const authLogger = (action, success = true, details = {}) => {
  const logData = {
    action,
    success,
    ...details
  };

  if (success) {
    logger.info('Authentication event', logData);
  } else {
    if (action === 'login_failed') {
      logger.security('Authentication failure', logData);
    } else {
      logger.warn('Authentication event', logData);
    }
  }
};

// Payment logger
const paymentLogger = (action, data = {}, success = true) => {
  const logData = {
    action,
    amount: data.amount,
    currency: data.currency,
    userId: data.userId,
    success
  };

  if (success) {
    logger.info('Payment processed', logData);
  } else {
    logger.error('Payment failed', { ...logData, error: data.error });
  }
};

// Performance monitoring logger
const performanceLogger = (operation, startTime, threshold = 1000) => {
  const duration = Date.now() - startTime;
  const exceeded = duration > threshold;

  const logData = {
    operation,
    duration: `${duration}ms`,
    threshold: `${threshold}ms`,
    exceeded
  };

  if (exceeded) {
    logger.performance('Performance threshold exceeded', logData);
  } else {
    logger.debug('Performance measurement', logData);
  }

  return { duration, exceeded };
};

// Business logic operation logger
const businessLogger = (operation, entity, entityId, details = {}, success = true) => {
  const logData = {
    operation,
    entity,
    entityId,
    success,
    ...details
  };

  if (success) {
    logger.info('Business operation completed', logData);
  } else {
    logger.warn('Business operation failed', logData);
  }
};

// System event logger
const systemLogger = (event, details = {}) => {
  const logData = {
    event,
    ...details,
    timestamp: new Date().toISOString()
  };

  logger.info('System event', logData);
};

// Health check logger
const healthLogger = (service, status, metrics = {}) => {
  const logData = {
    service,
    status,
    ...metrics
  };

  if (status === 'healthy') {
    logger.debug('Health check passed', logData);
  } else {
    logger.warn('Health check failed', logData);
  }
};

// Error context logger
const errorLogger = (error, context = {}) => {
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    ...context
  };

  logger.error('Error occurred', logData);
};

// Graceful shutdown logger
const shutdownLogger = async () => {
  logger.info('Initiating graceful shutdown...', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });

  // Wait a bit for logs to flush
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Final log entry
  logger.info('Shutdown process completed', {
    timestamp: new Date().toISOString()
  });
};

// Export logger instance and helper methods
module.exports = Object.assign(logger, {
  requestLogger,
  databaseLogger,
  cacheLogger,
  authLogger,
  paymentLogger,
  performanceLogger,
  businessLogger,
  systemLogger,
  healthLogger,
  errorLogger,
  shutdownLogger
});