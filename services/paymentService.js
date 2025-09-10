/**
 * Enterprise Payment Service
 *
 * Advanced payment processing service with security, fraud detection,
 * and comprehensive transaction management
 */

// External Dependencies
const mongoose = require('mongoose');
const crypto = require('crypto');

// Internal Dependencies
const Payment = require('../models/Payment');
const UserSubscription = require('../models/UserSubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');

// Error Classes and Utilities
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  DatabaseError
} = require('../utils/errorHandler');

const Logger = require('../utils/logger');

/**
 * PaymentGatewayAdapter
 * Abstract interface for payment gateways
 */
class PaymentGatewayAdapter {
  async createOrder(amount, currency, metadata) {
    throw new Error('createOrder must be implemented by concrete adapter');
  }

  async verifyPayment(orderId, paymentData) {
    throw new Error('verifyPayment must be implemented by concrete adapter');
  }

  async refundPayment(paymentId, amount, reason) {
    throw new Error('refundPayment must be implemented by concrete adapter');
  }
}

/**
 * Razorpay Payment Gateway Adapter
 */
class RazorpayAdapter extends PaymentGatewayAdapter {
  constructor() {
    super();
    this.razorpay = require('razorpay');
    this.instance = new this.razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  async createOrder(amount, currency, metadata) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt: metadata.receipt || `rcpt_${Date.now()}`,
        payment_capture: 1, // Auto-capture
        notes: metadata.note || {}
      };

      const order = await this.instance.orders.create(options);

      return {
        gateway: 'razorpay',
        orderId: order.id,
        amount: amount,
        currency: currency,
        gatewayOrderId: order.id
      };

    } catch (error) {
      Logger.error('Razorpay Order Creation Failed', {
        error: error.message,
        amount,
        currency,
        metadata
      });
      throw new ExternalServiceError('Razorpay', 'Failed to create order');
    }
  }

  async verifyPayment(orderId, paymentData) {
    try {
      const { razorpay_payment_id, razorpay_signature } = paymentData;

      // Create signature verification
      const sign = `${orderId}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest('hex');

      if (expectedSignature === razorpay_signature) {
        // Fetch payment details for validation
        const payment = await this.instance.payments.fetch(razorpay_payment_id);

        return {
          gateway: 'razorpay',
          paymentId: razorpay_payment_id,
          orderId: orderId,
          status: payment.status,
          amount: payment.amount / 100,
          currency: payment.currency,
          fee: payment.fee ? payment.fee / 100 : 0,
          verified: true,
          gatewayMetadata: payment
        };
      }

      return {
        verified: false,
        error: 'Signature verification failed'
      };

    } catch (error) {
      Logger.error('Razorpay Payment Verification Failed', {
        error: error.message,
        orderId,
        paymentData
      });
      throw new ExternalServiceError('Razorpay', 'Payment verification failed');
    }
  }

  async refundPayment(paymentId, amount, reason) {
    try {
      const refund = await this.instance.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
        notes: {
          reason: reason,
          timestamp: new Date().toISOString()
        }
      });

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        speed_processed: refund.speed_processed,
        speed_requested: refund.speed_requested
      };

    } catch (error) {
      Logger.error('Razorpay Refund Failed', {
        error: error.message,
        paymentId,
        amount,
        reason
      });
      throw new ExternalServiceError('Razorpay', 'Refund processing failed');
    }
  }
}

/**
 * Enterprise Payment Service
 *
 * Handles all payment operations with security, monitoring, and compliance
 */
class PaymentService {
  constructor() {
    // Initialize gateway adapters
    this.gateways = {
      razorpay: new RazorpayAdapter(),
      // stripe: new StripeAdapter(), // Can be added later
    };

    // Circuit breaker state
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      state: 'CLOSED',
      failureThreshold: 5,
      recoveryTimeout: 60000
    };

    // Fraud detection settings
    this.fraudDetection = {
      enabled: true,
      maxAmountPerHour: 50000, // ₹50,000 per hour
      maxTransactionsPerHour: 10,
      blockedCountries: ['CU', 'IR', 'KP', 'SY'],
      suspiciousPatterns: {
        sameAmount: { threshold: 5, windowMinutes: 30 },
        sameUserAgent: { threshold: 50, windowMinutes: 60 }
      }
    };
  }

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================

  /**
   * Initiate payment order creation
   *
   * @param {Object} paymentRequest - Payment request data
   * @param {String} userId - User initiating payment
   * @returns {Promise<Object>} Payment order data
   */
  async createPaymentOrder(paymentRequest, userId) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('payment_order_init', 'payment', null, {
        transactionId,
        userId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        planId: paymentRequest.planId
      });

      // Comprehensive validation
      this._validateGatewayConfiguration();
      await this._validatePaymentRequest(paymentRequest, userId);

      // Fraud detection
      if (this.fraudDetection.enabled) {
        await this._performFraudCheck(paymentRequest, userId, transactionId);
      }

      // Select appropriate gateway
      const gateway = this._selectGateway(paymentRequest);
      const gatewayAdapter = this.gateways[gateway];

      // Create order with metadata
      const orderMetadata = {
        userId,
        planId: paymentRequest.planId,
        transactionId,
        ip: paymentRequest.ip || 'unknown',
        userAgent: paymentRequest.userAgent || 'unknown',
        timestamp: new Date().toISOString()
      };

      const order = await gatewayAdapter.createOrder(
        paymentRequest.amount,
        paymentRequest.currency || 'INR',
        orderMetadata
      );

      // Create payment record
      const paymentRecord = new Payment({
        userId,
        subscriptionId: paymentRequest.subscriptionId,
        planId: paymentRequest.planId,
        transaction: {
          gateway: gateway,
          gatewayTransactionId: order.gatewayOrderId,
          orderId: order.orderId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency || 'INR',
          status: 'pending',
          referenceCode: transactionId
        },
        billingPeriod: paymentRequest.billingPeriod || {},
        paymentMethod: paymentRequest.paymentMethod || {},
        audit: {
          initiatedAt: new Date(),
          ipAddress: paymentRequest.ip,
          userAgent: paymentRequest.userAgent,
          userId
        }
      });

      await paymentRecord.save();

      Logger.performanceLogger('createPaymentOrder', startTime, 2000, {
        gateway,
        transactionId
      });

      return {
        success: true,
        data: {
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          gateway: gateway,
          paymentRecordId: paymentRecord._id,
          channel: 'web'
        },
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'createPaymentOrder',
        transactionId,
        userId,
        paymentRequest,
        error: error.message
      });

      throw this._handlePaymentError(error, 'Payment order creation failed');
    }
  }

  /**
   * Verify and process payment completion
   *
   * @param {Object} paymentData - Payment verification data
   * @param {String} userId - User who made the payment
   * @returns {Promise<Object>} Payment verification result
   */
  async verifyPayment(paymentData, userId) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const { orderId, razorpay_payment_id, razorpay_signature } = paymentData;

      Logger.businessLogger('payment_verify', 'payment', null, {
        transactionId,
        userId,
        orderId,
        paymentId: razorpay_payment_id
      });

      // Find payment record
      const payment = await Payment.findOne({
        userId,
        'transaction.orderId': orderId,
        'transaction.status': 'pending'
      });

      if (!payment) {
        throw new NotFoundError('Payment record not found');
      }

      // Get gateway adapter
      const gatewayAdapter = this.gateways[payment.transaction.gateway];
      if (!gatewayAdapter) {
        throw new ExternalServiceError('Payment Gateway', 'Gateway not configured');
      }

      // Verify payment
      const verification = await gatewayAdapter.verifyPayment(orderId, {
        razorpay_payment_id,
        razorpay_signature
      });

      if (!verification.verified) {
        await this._handlePaymentFailure(payment, verification.error, transactionId);
        throw new ValidationError('Payment verification failed');
      }

      // Update payment record as successful
      await this._processSuccessfulPayment(
        payment,
        verification,
        transactionId
      );

      // Create or update user subscription
      const subscription = await this._createUserSubscription(payment, verification);

      Logger.performanceLogger('verifyPayment', startTime, 1500, {
        gateway: payment.transaction.gateway,
        transactionId
      });

      return {
        success: true,
        data: {
          paymentId: verification.paymentId,
          orderId: verification.orderId,
          amount: verification.amount,
          currency: verification.currency,
          status: 'completed',
          subscriptionId: subscription._id,
          receipt: `rcpt_${verification.paymentId}`
        },
        message: 'Payment verified and subscription created successfully',
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'verifyPayment',
        transactionId,
        userId,
        orderId: paymentData.orderId,
        error: error.message
      });

      throw this._handlePaymentError(error, 'Payment verification failed');
    }
  }

  /**
   * Process payment refund
   *
   * @param {String} paymentId - Payment ID to refund
   * @param {Number} amount - Refund amount
   * @param {String} reason - Refund reason
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(paymentId, amount, reason, metadata = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('payment_refund', 'payment', paymentId, {
        transactionId,
        amount,
        reason,
        metadata
      });

      // Find payment record
      const payment = await Payment.findById(paymentId)
        .populate('userId', 'name email')
        .populate('subscriptionId', 'subscriptionInfo.name billing.endDate');

      if (!payment) {
        throw new NotFoundError('Payment');
      }

      if (payment.transaction.status !== 'completed') {
        throw new ValidationError('Can only refund completed payments');
      }

      // Get gateway adapter
      const gatewayAdapter = this.gateways[payment.transaction.gateway];

      // Process refund through gateway
      const refundResult = await gatewayAdapter.refundPayment(
        payment.transaction.gatewayTransactionId,
        amount,
        reason
      );

      if (!refundResult.refundId) {
        await this._handleRefundFailure(payment, reason, transactionId);
        throw new ExternalServiceError('Payment Gateway', 'Refund processing failed');
      }

      // Update payment record
      await Payment.findByIdAndUpdate(paymentId, {
        $push: {
          refunds: {
            amount,
            currency: payment.transaction.currency,
            reason,
            refundedBy: metadata.refundedBy || null,
            refundTransactionId: refundResult.refundId
          }
        }
      });

      Logger.performanceLogger('processRefund', startTime, 2500, {
        gateway: payment.transaction.gateway,
        transactionId
      });

      return {
        success: true,
        data: {
          refundId: refundResult.refundId,
          amount,
          currency: payment.transaction.currency,
          reason,
          processedAt: new Date()
        },
        message: 'Refund processed successfully',
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'processRefund',
        paymentId,
        transactionId,
        error: error.message
      });

      throw this._handlePaymentError(error, 'Refund processing failed');
    }
  }

  // ============================================================================
  // PAYMENT ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get payment analytics for admin dashboard
   *
   * @param {Object} filters - Date range, gateway, etc.
   * @returns {Promise<Object>} Payment analytics
   */
  async getPaymentAnalytics(filters = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const matchStage = this._buildAnalyticsMatchStage(filters);

      const analytics = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$transaction.amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$transaction.status', 'completed'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$transaction.status', 'failed'] }, 1, 0] }
            },
            totalRefunds: { $sum: { $size: '$refunds' } },
            refundAmount: { $sum: { $sum: '$refunds.amount' } },
            byGateway: {
              $push: '$transaction.gateway'
            },
            byCurrency: {
              $push: '$transaction.currency'
            }
          }
        }
      ]);

      const result = analytics[0] || {};

      Logger.performanceLogger('getPaymentAnalytics', startTime, 800, { transactionId });

      return {
        success: true,
        data: {
          summary: {
            totalPayments: result.totalPayments || 0,
            totalAmount: result.totalAmount || 0,
            successRate: result.totalPayments ? (result.successfulPayments / result.totalPayments) * 100 : 0,
            averageAmount: result.totalPayments ? result.totalAmount / result.totalPayments : 0
          },
          refunds: {
            totalRefunds: result.totalRefunds || 0,
            refundAmount: result.refundAmount || 0,
            refundRate: result.totalAmount ? (result.refundAmount / result.totalAmount) * 100 : 0
          },
          filters
        },
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getPaymentAnalytics',
        transactionId,
        error: error.message
      });

      throw this._handlePaymentError(error, 'Analytics retrieval failed');
    }
  }

  // ============================================================================
  // WEBHOOKS AND EVENT PROCESSING
  // ============================================================================

  /**
   * Process payment gateway webhook
   *
   * @param {String} gateway - Payment gateway
   * @param {Object} webhookData - Webhook payload
   * @param {Object} headers - Webhook headers
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhook(gateway, webhookData, headers) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('webhook_received', 'payment', null, {
        transactionId,
        gateway,
        eventType: webhookData.event,
        paymentId: webhookData.payload?.payment?.entity?.id
      });

      // Validate webhook signature
      const isValid = await this._validateWebhookSignature(gateway, webhookData, headers);
      if (!isValid) {
        throw new ValidationError('Invalid webhook signature');
      }

      // Process based on event type
      const result = await this._processWebhookEvent(gateway, webhookData, transactionId);

      Logger.performanceLogger('processWebhook', startTime, 1000, {
        gateway,
        eventType: webhookData.event,
        transactionId
      });

      return result;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'processWebhook',
        transactionId,
        gateway,
        webhookData,
        error: error.message
      });

      throw this._handlePaymentError(error, 'Webhook processing failed');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  _generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `pay_${timestamp}_${random}`;
  }

  _validateGatewayConfiguration() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new ExternalServiceError('Razorpay', 'Gateway configuration missing');
    }
  }

  async _validatePaymentRequest(request, userId) {
    if (!request.amount || request.amount <= 0) {
      throw new ValidationError('Valid amount is required');
    }

    if (!request.planId) {
      throw new ValidationError('Plan ID is required');
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Validate plan exists and is available
    const plan = await SubscriptionPlan.findById(request.planId);
    if (!plan || !plan.business?.isActive || !plan.business?.isVisible) {
      throw new NotFoundError('Subscription Plan');
    }
  }

  async _performFraudCheck(request, userId, transactionId) {
    // Implement fraud detection logic
    const userHistory = await Payment.find({
      userId,
      'audit.initiatedAt': {
        $gte: new Date(Date.now() - this.fraudDetection.suspiciousPatterns.sameAmount.windowMinutes * 60000)
      }
    });

    // Check for suspicious patterns
    if (userHistory.length >= this.fraudDetection.maxTransactionsPerHour) {
      throw new ValidationError('Too many transactions per hour. Please try again later.');
    }

    Logger.fraudLogger('fraud_check', {
      transactionId,
      userId,
      amount: request.amount,
      pattern: 'volume_check',
      riskLevel: 'low'
    });
  }

  _selectGateway(request) {
    // Select appropriate gateway based on request
    return 'razorpay';
  }

  _buildAnalyticsMatchStage(filters) {
    const match = {};

    if (filters.startDate && filters.endDate) {
      match.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    if (filters.status) {
      match['transaction.status'] = filters.status;
    }

    if (filters.gateway) {
      match['transaction.gateway'] = filters.gateway;
    }

    return match;
  }

  async _processSuccessfulPayment(payment, verification, transactionId) {
    payment.transaction.status = 'completed';
    payment.transaction.paymentId = verification.paymentId;
    payment.audit.completedAt = new Date();
    payment.audit.gatewayMetadata = verification.gatewayMetadata;

    // Update risk score based on successful payment
    payment.audit.riskScore = payment.audit.riskScore || 10;

    await payment.save();
  }

  async _handlePaymentFailure(payment, error, transactionId) {
    payment.transaction.status = 'failed';
    payment.transaction.failure_reason = error;
    payment.audit.failedAt = new Date();

    const failure = {
      reason: error,
      success: false,
      timestamp: new Date()
    };

    payment.audit.retries.push(failure);
    await payment.save();
  }

  async _createUserSubscription(payment, verification) {
    // Create or update user subscription
    let subscription = await UserSubscription.findOne({
      userId: payment.userId,
      planId: payment.planId
    });

    if (!subscription) {
      const SubscriptionPlanService = require('./subscriptionPlanService');

      const result = await SubscriptionPlanService.createUserSubscription(
        payment.userId,
        payment.planId,
        {
          paymentId: verification.paymentId,
          amount: verification.amount
        }
      );

      subscription = result.data;
    }

    return subscription;
  }

  async _handleRefundFailure(payment, reason, transactionId) {
    // Log refund failure
    Logger.error(`Refund Failure - Payment: ${payment._id}, Reason: ${reason}, Transaction: ${transactionId}`);
  }

  async _validateWebhookSignature(gateway, webhookData, headers) {
    // Implement webhook signature validation for each gateway
    return true; // Simplified for now
  }

  async _processWebhookEvent(gateway, webhookData, transactionId) {
    const eventType = webhookData.event;
    const entity = webhookData.payload?.payment?.entity;

    if (!entity) return { success: true, message: 'No payment entity in webhook' };

    const payment = await Payment.findOne({
      'transaction.gatewayTransactionId': entity.id
    });

    if (!payment) {
      throw new NotFoundError('Payment for webhook');
    }

    // Update payment based on webhook event
    if (eventType === 'payment.captured') {
      payment.transaction.status = 'completed';
    } else if (eventType === 'payment.failed') {
      payment.transaction.status = 'failed';
      payment.transaction.failure_reason = entity.error_description;
    }

    // Store webhook event
    payment.webhooks.push({
      eventType,
      eventData: webhookData,
      gatewayEventId: webhookData.id,
      receivedAt: new Date(),
      processingSuccess: true
    });

    await payment.save();

    return {
      success: true,
      message: `Webhook processed: ${eventType}`,
      transactionId
    };
  }

  _handlePaymentError(error, defaultMessage) {
    if (error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof ExternalServiceError) {
      return error;
    }

    Logger.error('Payment Service Error', {
      message: error.message,
      stack: error.stack,
      defaultMessage
    });

    return new DatabaseError(`${defaultMessage}: ${error.message}`);
  }
}

module.exports = new PaymentService();