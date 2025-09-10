/**
 * Enterprise Error Handling System
 *
 * Comprehensive error management with structured errors, logging, and response formatting
 */

const Logger = require('./logger');

/**
 * Custom Error Classes for Enterprise Error Management
 */

// Base Application Error
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Client Errors
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Resource Errors
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message, details = {}) {
    super(message, 409, 'CONFLICT_ERROR');
    this.details = details;
  }
}

// System Errors
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`External service error: ${service} - ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Error Response Formatter
 */
const formatErrorResponse = (error, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isOperationalError = error.isOperational !== false;

  const baseResponse = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add additional details for development and operational errors
  if (isDevelopment) {
    baseResponse.error.stack = error.stack;
    if (error.details) {
      baseResponse.error.details = error.details;
    }
  } else if (isOperationalError && error.details) {
    baseResponse.error.details = error.details;
  }

  return baseResponse;
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (error, req, res, next) => {
  let processedError = error;

  // Handle MongoDB/Mongoose errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    processedError = new DatabaseError('Database operation failed', error);
  } else if (error.name === 'ValidationError') {
    processedError = new ValidationError('Data validation failed', error.errors);
  } else if (error.name === 'CastError') {
    processedError = new ValidationError('Invalid data format');
  } else if (error.code === 11000) {
    processedError = new ConflictError('Duplicate entry found');
  }

  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    processedError = new AuthenticationError('Invalid authentication token');
  } else if (error.name === 'TokenExpiredError') {
    processedError = new AuthenticationError('Authentication token expired');
  }

  // Handle file upload errors
  else if (error.code === 'LIMIT_FILE_SIZE') {
    processedError = new ValidationError('File size exceeds limit');
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    processedError = new ValidationError('Unexpected file type');
  }

  // Handle external service errors (Razorpay, etc.)
  else if (error.name === 'RazorpayError') {
    processedError = new ExternalServiceError('Payment Gateway', error.description || error.message);
  }

  // Log error for monitoring
  const logData = {
    message: processedError.message,
    code: processedError.code,
    statusCode: processedError.statusCode,
    stack: processedError.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user._id : undefined,
    timestamp: new Date().toISOString()
  };

  if (processedError.isOperational) {
    Logger.warn('Operational Error', logData);
  } else {
    Logger.error('System Error', logData);
  }

  // Determine status code
  const statusCode = processedError.statusCode || 500;

  // Send error response
  const errorResponse = formatErrorResponse(processedError, req);
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Error Wrapper
 * Catches promise rejections and forwards to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Endpoint');
  next(error);
};

/**
 * Validation Error Formatter
 */
const formatValidationErrors = (errors) => {
  const formattedErrors = {};

  Object.keys(errors).forEach(key => {
    formattedErrors[key] = {
      message: errors[key].message,
      value: errors[key].value
    };
  });

  return formattedErrors;
};

/**
 * Request Validation Middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = formatValidationErrors(error.details);
      const validationError = new ValidationError('Request validation failed', details);
      return next(validationError);
    }

    req.body = value;
    next();
  };
};

/**
 * Rate Limit Error Handler
 */
const rateLimitHandler = (req, res, next) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Security Error Handler for Suspicious Requests
 */
const securityHandler = (securityIssue, req, res, next) => {
  Logger.security('Security Issue Detected', {
    issue: securityIssue,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  const error = new AppError('Security violation detected', 403, 'SECURITY_VIOLATION');
  next(error);
};

/**
 * Performance Monitoring Error
 */
const performanceHandler = (operation, duration, threshold) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    threshold: `${threshold}ms`,
    exceededBy: `${duration - threshold}ms`,
    timestamp: new Date().toISOString()
  };

  Logger.performance('Performance Threshold Exceeded', logData);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,

  errorHandler,
  asyncHandler,
  notFoundHandler,
  rateLimitHandler,
  securityHandler,
  performanceHandler,
  validateRequest,
  formatValidationErrors,
  formatErrorResponse
};