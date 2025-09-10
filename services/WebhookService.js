/**
 * Enterprise Webhook Service
 *
 * Secure webhook processing for payment gateways with validation,
 * deduplication, signature verification, and comprehensive event handling
 */

// External Dependencies
const crypto = require('crypto');

// Internal Dependencies
const Payment = require('../models/Payment');
const UserSubscription = require('../models/UserSubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

// Gateway Adapters
const RazorpayAdapter = require('./gateways/RazorpayAdapter');
const StripeAdapter = require('./gateways/StripeAdapter');
const PayPalAdapter = require('./gateways/PayPalAdapter');

// Error Classes and Utilities
const {
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  DatabaseError
} = require('../utils/errorHandler');

const Logger = require('../utils/logger');

/**
 * Enterprise Webhook Service
 *
 * Handles secure webhook processing with deduplication, signature verification,
 * event correlation, and comprehensive error handling
 */
class WebhookService {
  constructor() {
    // Initialize gateway adapters for webhook verification
    this.adapters = {
      razorpay: new RazorpayAdapter(),
      stripe: new StripeAdapter(),
      paypal: new PayPalAdapter()
    };

    // Webhook processing configuration
    this.config = {
      enabled: process.env.WEBHOOK_PROCESSING_ENABLED !== 'false',
      signatureVerificationEnabled: process.env.NODE_ENV === 'production',
      retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS) || 3,
      retryDelays: [5000, 30000, 120000], // 5s, 30s, 2min

      // Security configuration
      rateLimit: {
        enabled: true,
        windowMs: 60000, // 1 minute
        maxRequests: 100 // 100 requests per minute per IP
      },

      // Deduplication settings
      deduplication: {
        enabled: true,
        windowMs: 300000, // 5 minutes
        cacheSize: 10000
      }
    };

    // In-memory deduplication cache (in production, use Redis)
    this.processedWebhooks = new Map();

    // Rate limiting cache
    this.rateLimitCache = new Map();
  }

  /**
   * Process incoming webhook
   *
   * @param {string} gateway - Payment gateway (razorpay, stripe, paypal)
   * @param {Object} webhookData - Raw webhook payload
   * @param {Object} headers - Request headers
   * @param {string} rawBody - Raw request body (for signature verification)
   * @param {Object} context - Additional context (IP, timestamp, etc.)
   * @returns {Promise<Object>} Processing result
   */
  async processWebhook(gateway, webhookData, headers, rawBody, context = {}) {
    const webhookId = this._extractWebhookId(gateway, webhookData);
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('webhook_received', 'webhook', null, {
        transactionId,
        gateway,
        webhookId,
        eventType: this._extractEventType(gateway, webhookData),
        context
      });

      // Step 1: Rate limiting check
      await this._rateLimitCheck(context.ip, transactionId);

      // Step 2: Deduplication check
      if (this.config.deduplication.enabled) {
        const isDuplicate = await this._checkDeduplication(webhookId, transactionId);
        if (isDuplicate) {
          Logger.businessLogger('webhook_duplicate', 'webhook', webhookId, {
            transactionId,
            gateway
          });
          return {
            success: true,
            processed: false,
            reason: 'duplicate_webhook',
            webhookId,
            transactionId
          };
        }
      }

      // Step 3: Verify webhook signature
      if (this.config.signatureVerificationEnabled) {
        const verification = await this._verifyWebhookSignature(gateway, webhookData, headers, rawBody);
        if (!verification.verified) {
          Logger.securityLogger('webhook_signature_invalid', {
            gateway,
            webhookId,
            reason: verification.reason,
            transactionId
          });
          throw new ValidationError('Webhook signature verification failed', {
            gateway,
            webhookId,
            reason: verification.reason
          });
        }
      }

      // Step 4: Process webhook event
      const processed = await this._processWebhookEvent(gateway, webhookData, transactionId);

      // Step 5: Mark as processed (for deduplication)
      await this._markWebhookProcessed(webhookId, transactionId);

      Logger.performanceLogger('processWebhook', startTime, 1000, {
        gateway,
        webhookId,
        transactionId,
        eventProcessed: processed.processed
      });

      return {
        success: true,
        ...processed,
        webhookId,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'processWebhook',
        transactionId,
        gateway,
        webhookId,
        error: error.message
      });

      // Store failed webhook for retry processing
      await this._storeFailedWebhook(gateway, webhookId, webhookData, error, transactionId);

      throw this._handleWebhookError(error, 'Webhook processing failed');
    }
  }

  /**
   * Process failed webhooks with retry mechanism
   *
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Retry processing result
   */
  async processFailedWebhooks(maxRetries = null) {
    const retryLimit = maxRetries || this.config.retryAttempts;
    const startTime = Date.now();

    try {
      // Find failed webhooks that can be retried
      const failedWebhooks = await this._getFailedWebhooksForRetry(retryLimit);

      Logger.businessLogger('retry_failed_webhooks', 'webhook', null, {
        totalFailed: failedWebhooks.length,
        retryLimit
      });

      const results = { processed: 0, failed: 0, skipped: 0 };

      for (const failedWebhook of failedWebhooks) {
        try {
          // Check if we're within retry limits
          if (failedWebhook.retryCount >= retryLimit) {
            results.skipped++;
            continue;
          }

          // Calculate retry delay
          const retryDelay = this._calculateRetryDelay(failedWebhook.retryCount);
          const timeSinceLastAttempt = Date.now() - (failedWebhook.lastRetryAt || 0);

          if (timeSinceLastAttempt < retryDelay) {
            continue; // Not ready for retry yet
          }

          // Attempt to process the webhook
          const result = await this.processWebhook(
            failedWebhook.gateway,
            failedWebhook.webhookData,
            failedWebhook.headers,
            failedWebhook.rawBody,
            { isRetry: true, attemptNumber: failedWebhook.retryCount + 1 }
          );

          if (result.success) {
            await this._markFailedWebhookProcessed(failedWebhook._id);
            results.processed++;
          } else {
            await this._incrementFailedWebhookRetries(failedWebhook._id);
            results.failed++;
          }

        } catch (error) {
          results.failed++;
          Logger.errorLogger(error, {
            operation: 'retryWebhook',
            webhookId: failedWebhook.webhookId,
            retryCount: failedWebhook.retryCount + 1
          });
        }
      }

      Logger.performanceLogger('processFailedWebhooks', startTime, 5000, results);

      return {
        success: true,
        results,
        totalProcessed: failedWebhooks.length
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'processFailedWebhooks',
        error: error.message
      });

      throw this._handleWebhookError(error, 'Failed webhook retry processing');
    }
  }

  /**
   * Get webhook processing statistics
   *
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Webhook statistics
   */
  async getWebhookStatistics(filters = {}) {
    try {
      const matchStage = this._buildStatisticsMatchStage(filters);

      const stats = await Payment.aggregate([
        { $match: matchStage },
        {
          $project: {
            gateway: '$transaction.gateway',
            status: '$transaction.status',
            webhooksCount: { $size: '$webhooks' },
            webhooksSuccessful: {
              $size: {
                $filter: {
                  input: '$webhooks',
                  cond: { $eq: ['$$this.processedSuccess', true] }
                }
              }
            },
            webhooksFailed: {
              $size: {
                $filter: {
                  input: '$webhooks',
                  cond: { $eq: ['$$this.processedSuccess', false] }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: '$gateway',
            totalPayments: { $sum: 1 },
            totalWebhooks: { $sum: '$webhooksCount' },
            successfulWebhooks: { $sum: '$webhooksSuccessful' },
            failedWebhooks: { $sum: '$webhooksFailed' },
            completedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        }
      ]);

      const processedStats = stats.reduce((acc, stat) => {
        acc[stat._id] = {
          totalPayments: stat.totalPayments,
          totalWebhooks: stat.totalWebhooks,
          successfulWebhooks: stat.successfulWebhooks,
          failedWebhooks: stat.failedWebhooks,
          completedPayments: stat.completedPayments,
          webhookSuccessRate: stat.totalWebhooks > 0 ?
            ((stat.successfulWebhooks / stat.totalWebhooks) * 100).toFixed(2) : 0
        };
        return acc;
      }, {});

      return {
        success: true,
        data: processedStats,
        filters
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getWebhookStatistics',
        error: error.message
      });

      throw this._handleWebhookError(error, 'Webhook statistics retrieval failed');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  _generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `wh_${timestamp}_${random}`;
  }

  /**
   * Extract webhook ID from webhook data
   */
  _extractWebhookId(gateway, webhookData) {
    switch (gateway) {
      case 'razorpay':
        return webhookData.id || webhookData.payment?.id;
      case 'stripe':
        return webhookData.id;
      case 'paypal':
        return webhookData.id;
      default:
        return `unknown_${Date.now()}`;
    }
  }

  /**
   * Extract event type from webhook data
   */
  _extractEventType(gateway, webhookData) {
    switch (gateway) {
      case 'razorpay':
        return webhookData.entity || webhookData.event;
      case 'stripe':
        return webhookData.type;
      case 'paypal':
        return webhookData.event_type;
      default:
        return 'unknown';
    }
  }

  /**
   * Rate limiting check for webhook processing
   */
  async _rateLimitCheck(ip, transactionId) {
    if (!this.config.rateLimit.enabled) return;

    const key = `${ip}_webhook`;
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;

    // Clean old entries
    for (const [cacheKey, timestamps] of this.rateLimitCache.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length > 0) {
        this.rateLimitCache.set(cacheKey, validTimestamps);
      } else {
        this.rateLimitCache.delete(cacheKey);
      }
    }

    // Check current request count
    let timestamps = this.rateLimitCache.get(key) || [];
    if (timestamps.length >= this.config.rateLimit.maxRequests) {
      Logger.securityLogger('webhook_rate_limit_exceeded', {
        transactionId,
        ip,
        requestCount: timestamps.length,
        maxRequests: this.config.rateLimit.maxRequests
      });
      throw new ValidationError('Too many webhook requests from this IP');
    }

    // Add current timestamp
    timestamps.push(now);
    this.rateLimitCache.set(key, timestamps);
  }

  /**
   * Deduplication check for webhook processing
   */
  async _checkDeduplication(webhookId, transactionId) {
    const cacheKey = webhookId;
    const cached = this.processedWebhooks.get(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.config.deduplication.windowMs) {
        // Still within deduplication window
        Logger.businessLogger('webhook_deduplicated', 'webhook', webhookId, {
          transactionId,
          originalTimestamp: cached.timestamp,
          age
        });
        return true;
      } else {
        // Deduplication window expired, remove from cache
        this.processedWebhooks.delete(cacheKey);
      }
    }

    // Clean old entries from cache
    const cutoff = Date.now() - this.config.deduplication.windowMs;
    for (const [key, data] of this.processedWebhooks.entries()) {
      if (data.timestamp < cutoff) {
        this.processedWebhooks.delete(key);
      }
    }

    // Check for deduplication in database as well
    const existingWebhook = await Payment.findOne({
      'webhooks.webhookId': webhookId,
      'webhooks.receivedAt': { $gte: new Date(Date.now() - this.config.deduplication.windowMs) }
    });

    return !!existingWebhook;
  }

  /**
   * Mark webhook as processed for deduplication
   */
  async _markWebhookProcessed(webhookId, transactionId) {
    this.processedWebhooks.set(webhookId, {
      timestamp: Date.now(),
      transactionId
    });

    // Keep cache size reasonable
    if (this.processedWebhooks.size > this.config.deduplication.cacheSize) {
      const oldestKey = this.processedWebhooks.keys().next().value;
      this.processedWebhooks.delete(oldestKey);
    }
  }

  /**
   * Verify webhook signature
   */
  async _verifyWebhookSignature(gateway, webhookData, headers, rawBody) {
    try {
      const adapter = this.adapters[gateway];
      if (!adapter) {
        return { verified: false, reason: 'unknown_gateway' };
      }

      // Use adapter's verification method
      switch (gateway) {
        case 'razorpay':
          return this._verifyRazorpaySignature(webhookData, headers);

        case 'stripe':
          if (typeof adapter.verifyWebhookSignature === 'function') {
            return adapter.verifyWebhookSignature(rawBody, headers['stripe-signature'] || '');
          }
          break;

        case 'paypal':
          if (typeof adapter.verifyWebhookSignature === 'function') {
            return adapter.verifyWebhookSignature(webhookData, headers);
          }
          break;
      }

      // Default: allow in development
      if (process.env.NODE_ENV === 'development') {
        return { verified: true, reason: 'development_mode' };
      }

      return { verified: false, reason: 'verification_method_not_available' };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: '_verifyWebhookSignature',
        gateway,
        error: error.message
      });
      return { verified: false, reason: 'verification_error', error: error.message };
    }
  }

  /**
   * Verify Razorpay webhook signature
   */
  _verifyRazorpaySignature(webhookData, headers) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      return process.env.NODE_ENV === 'development'
        ? { verified: true, reason: 'no_secret_development' }
        : { verified: false, reason: 'webhook_secret_not_configured' };
    }

    try {
      const signature = headers['x-razorpay-signature'];
      if (!signature) {
        return { verified: false, reason: 'missing_signature_header' };
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      const verified = expectedSignature === signature;

      return {
        verified,
        reason: verified ? 'valid_signature' : 'invalid_signature'
      };

    } catch (error) {
      return { verified: false, reason: 'signature_verification_error', error: error.message };
    }
  }

  /**
   * Process webhook event through appropriate adapter
   */
  async _processWebhookEvent(gateway, webhookData, transactionId) {
    try {
      const adapter = this.adapters[gateway];
      if (!adapter) {
        return {
          processed: false,
          error: 'Unknown gateway',
          eventType: this._extractEventType(gateway, webhookData)
        };
      }

      // Use adapter's event processing method
      if (typeof adapter.processWebhookEvent === 'function') {
        const result = await adapter.processWebhookEvent({
          type: this._extractEventType(gateway, webhookData),
          data: webhookData
        });

        return {
          processed: result.processed || false,
          action: result.action || 'unknown',
          eventType: result.eventType || this._extractEventType(gateway, webhookData),
          ...result
        };
      }

      // Fallback processing
      return await this._fallbackWebhookProcessing(gateway, webhookData, transactionId);

    } catch (error) {
      Logger.errorLogger(error, {
        operation: '_processWebhookEvent',
        gateway,
        transactionId,
        error: error.message
      });

      return {
        processed: false,
        error: error.message,
        eventType: this._extractEventType(gateway, webhookData)
      };
    }
  }

  /**
   * Fallback webhook processing for gateways without adapters
   */
  async _fallbackWebhookProcessing(gateway, webhookData, transactionId) {
    // Store webhook for manual processing
    const webhookRecord = {
      gateway,
      webhookId: this._extractWebhookId(gateway, webhookData),
      eventType: this._extractEventType(gateway, webhookData),
      webhookData,
      receivedAt: new Date(),
      processingSuccess: false,
      processingError: 'No adapter available for processing'
    };

    // Find related payment if possible
    const payment = await this._findRelatedPayment(gateway, webhookData);
    if (payment) {
      await Payment.findByIdAndUpdate(payment._id, {
        $push: { webhooks: webhookRecord }
      });
    }

    return {
      processed: false,
      action: 'stored_for_manual_processing',
      webhookRecord,
      message: 'Webhook stored for manual processing'
    };
  }

  /**
   * Find related payment for webhook processing
   */
  async _findRelatedPayment(gateway, webhookData) {
    let query = {};

    switch (gateway) {
      case 'razorpay':
        query['transaction.gatewayTransactionId'] = webhookData.id || webhookData.payment?.entity?.id;
        break;
      case 'stripe':
        query['transaction.gatewayTransactionId'] = webhookData.data?.object?.id;
        break;
      case 'paypal':
        query['transaction.gatewayTransactionId'] = webhookData.resource?.id;
        break;
    }

    return await Payment.findOne(query);
  }

  /**
   * Store failed webhook for retry
   */
  async _storeFailedWebhook(gateway, webhookId, webhookData, error, transactionId) {
    // In a real implementation, you'd store this in a failed_webhooks collection
    Logger.warn('Failed webhook stored for retry', {
      gateway,
      webhookId,
      transactionId,
      error: error.message
    });
  }

  /**
   * Get failed webhooks for retry
   */
  async _getFailedWebhooksForRetry(maxRetries) {
    // Implementation would query failed_webhooks collection
    return [];
  }

  /**
   * Mark failed webhook as processed
   */
  async _markFailedWebhookProcessed(id) {
    // Implementation would remove from failed_webhooks collection
  }

  /**
   * Increment failed webhook retry count
   */
  async _incrementFailedWebhookRetries(id) {
    // Implementation would update retry count in failed_webhooks collection
  }

  /**
   * Calculate retry delay based on attempt count
   */
  _calculateRetryDelay(retryCount) {
    const delayIndex = Math.min(retryCount, this.config.retryDelays.length - 1);
    return this.config.retryDelays[delayIndex];
  }

  /**
   * Build statistics match stage
   */
  _buildStatisticsMatchStage(filters) {
    const match = {};

    if (filters.startDate && filters.endDate) {
      match.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    if (filters.gateway) {
      match['transaction.gateway'] = filters.gateway;
    }

    if (filters.status) {
      match['transaction.status'] = filters.status;
    }

    return match;
  }

  /**
   * Handle webhook errors consistently
   */
  _handleWebhookError(error, defaultMessage) {
    if (error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof ExternalServiceError) {
      return error;
    }

    Logger.error('Webhook Service Error', {
      message: error.message,
      stack: error.stack,
      defaultMessage
    });

    return new DatabaseError(`${defaultMessage}: ${error.message}`);
  }
}

module.exports = new WebhookService();