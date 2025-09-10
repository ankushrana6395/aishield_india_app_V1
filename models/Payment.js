/**
 * Payment Transaction Model
 *
 * Comprehensive payment transaction tracking with reconciliation capabilities
 */

// External Dependencies
const mongoose = require('mongoose');

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

/**
 * Transaction Details Sub-Schema
 * Core payment transaction information
 */
const TransactionSchema = new mongoose.Schema({
  gateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'manual', 'bank_transfer'],
    required: true
  },
  gatewayTransactionId: {
    type: String,
    trim: true,
    comment: 'Gateway-generated transaction ID'
  },
  orderId: {
    type: String,
    trim: true,
    comment: 'Order ID from gateway'
  },
  paymentId: {
    type: String,
    trim: true,
    comment: 'Payment ID from gateway'
  },
  referenceCode: {
    type: String,
    trim: true,
    unique: true,
    comment: 'Internal reference code'
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    set: function(val) { return Math.round(val * 100) / 100; } // Round to 2 decimal places
  },
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed'],
    default: 'pending',
    required: true,
    index: true
  },
  failure_reason: {
    type: String,
    trim: true,
    maxlength: 200,
    comment: 'Reason for payment failure'
  }
}, { _id: false });

/**
 * Billing Period Sub-Schema
 * Track what billing period this payment covers
 */
const BillingPeriodSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  cycleType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime', 'custom'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 100,
    comment: 'Human-readable billing period description'
  }
}, { _id: false });

/**
 * Payment Method Details Sub-Schema
 * User payment method information (securely stored)
 */
const PaymentMethodDetailsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet', 'bank_transfer'],
    required: true
  },
  provider: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'rupay', 'paytm', 'phonepe', 'gpay', 'bhim'],
    trim: true
  },
  maskedNumber: {
    type: String,
    trim: true,
    comment: 'Last 4 digits or UPI ID prefix'
  },
  cardBrand: {
    type: String,
    enum: ['visa', 'mastercard', 'american_express', 'discover', 'rupay', 'diners_club'],
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    uppercase: true,
    match: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    trim: true
  },
  cardholderName: {
    type: String,
    trim: true,
    maxlength: 50
  }
}, { _id: false });

/**
 * Refund Information Sub-Schema
 */
const RefundSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
    set: function(val) { return Math.round(val * 100) / 100; }
  },
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD'],
    required: true
  },
  reason: {
    type: String,
    enum: ['customer_request', 'service_discontinued', 'billing_error', 'duplicate', 'fraud'],
    required: true
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: 'User who initiated refund'
  },
  refundedAt: {
    type: Date,
    default: Date.now
  },
  refundTransactionId: {
    type: String,
    trim: true,
    comment: 'Gateway refund transaction ID'
  }
}, { _id: false });

/**
 * Audit Trail Sub-Schema
 * Comprehensive tracking of payment lifecycle
 */
const PaymentAuditSchema = new mongoose.Schema({
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,

  // Processing metadata
  ipAddress: {
    type: String,
    trim: true,
    comment: 'IP address of payment initiation'
  },
  userAgent: {
    type: String,
    trim: true,
    comment: 'Browser/device user agent'
  },
  sessionId: {
    type: String,
    trim: true,
    comment: 'Session identifier'
  },

  // Gateway specific metadata
  gatewayMetadata: {
    type: mongoose.Schema.Types.Mixed,
    comment: 'Raw gateway response data'
  },

  // Risk assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    comment: 'Fraud risk score (0-100)'
  },
  isSuspicious: {
    type: Boolean,
    default: false
  },

  // Processing history
  retries: [{
    attemptDate: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 100
    },
    success: {
      type: Boolean,
      default: false
    },
    responseCode: String,
    _id: false
  }],

  // Source information
  refererURL: {
    type: String,
    trim: true,
    comment: 'Referrer URL'
  },
  marketingSource: {
    type: String,
    trim: true,
    comment: 'UTM source/origin tracking'
  }
}, { _id: false });

// ============================================================================
// MAIN SCHEMA
// ============================================================================

/**
 * Payment Transaction Schema
 * Enterprise-grade payment transaction management
 */
const PaymentSchema = new mongoose.Schema({
  // Core References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
    index: true
  },

  // Transaction Details
  transaction: {
    type: TransactionSchema,
    required: true
  },

  // Billing Context
  billingPeriod: {
    type: BillingPeriodSchema,
    required: true
  },

  // Payment Method Information (Encrypted/Secure)
  paymentMethod: {
    type: PaymentMethodDetailsSchema,
    required: true
  },

  // Payment Type Classification
  paymentType: {
    type: String,
    enum: ['subscription_payment', 'renewal_payment', 'upgrade_payment', 'downgrade_payment', 'one_time_payment', 'trial_conversion'],
    default: 'subscription_payment',
    required: true
  },

  // Amount Breakdown
  amountBreakdown: {
    baseAmount: {
      type: Number,
      min: 0,
      required: true,
      set: function(val) { return Math.round(val * 100) / 100; }
    },
    taxes: {
      type: Number,
      min: 0,
      default: 0,
      set: function(val) { return Math.round(val * 100) / 100; }
    },
    discounts: {
      type: Number,
      min: 0,
      default: 0,
      set: function(val) { return Math.round(val * 100) / 100; }
    },
    processingFee: {
      type: Number,
      min: 0,
      default: 0,
      set: function(val) { return Math.round(val * 100) / 100; }
    },
    totalAmount: {
      type: Number,
      min: 0,
      required: true,
      set: function(val) { return Math.round(val * 100) / 100; }
    }
  },

  // Refund Information
  refunds: [{
    type: RefundSchema,
    _id: false
  }],

  // Webhook Events
  webhooks: [{
    eventType: {
      type: String,
      enum: ['payment_capture', 'payment_failed', 'refund_success', 'refund_failed', 'dispute_created'],
      required: true
    },
    gatewayEventId: {
      type: String,
      trim: true
    },
    eventData: mongoose.Schema.Types.Mixed,
    receivedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    processingSuccess: {
      type: Boolean,
      default: true
    },
    _id: false
  }],

  // Reconciliation Status
  reconciliation: {
    matched: {
      type: Boolean,
      default: false
    },
    matchedAt: Date,
    discrepancies: [{
      field: String,
      expectedValue: mongoose.Schema.Types.Mixed,
      actualValue: mongoose.Schema.Types.Mixed,
      resolved: { type: Boolean, default: false },
      resolvedAt: Date,
      _id: false
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },

  // Complete Audit Trail
  audit: {
    type: PaymentAuditSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

// Performance indexes
PaymentSchema.index({ 'transaction.status': 1 });
PaymentSchema.index({ 'transaction.gatewayTransactionId': 1 });
PaymentSchema.index({ 'transaction.referenceCode': 1 }, { unique: true });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ 'audit.completedAt': -1 });

// Foreign key indexes
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ subscriptionId: 1 });
PaymentSchema.index({ planId: 1 });

// Compound indexes for complex queries
PaymentSchema.index({
  userId: 1,
  'transaction.status': 1,
  createdAt: -1
});

PaymentSchema.index({
  'transaction.status': 1,
  'audit.riskScore': -1
});

PaymentSchema.index({
  'reconciliation.matched': 1,
  createdAt: -1
});

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for display amount
PaymentSchema.virtual('displayAmount').get(function() {
  const currency = this.transaction.currency;
  const amount = this.transaction.amount;

  const currencySymbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'CAD'
  };

  return `${currencySymbols[currency] || currency}${amount}`;
});

// Virtual for refund status
PaymentSchema.virtual('refundStatus').get(function() {
  const refunds = this.refunds;
  const totalAmount = this.transaction.amount;

  if (!refunds || refunds.length === 0) return 'no_refund';

  const refundedAmount = refunds.reduce((sum, refund) =>
    refund.reason !== 'fraud' ? sum + refund.amount : sum, 0
  );

  if (refundedAmount === 0) return 'no_refund';
  if (refundedAmount >= totalAmount) return 'fully_refunded';
  return 'partially_refunded';
});

// Virtual for reconciliation status
PaymentSchema.virtual('reconciliationStatus').get(function() {
  if (this.reconciliation.matched) return 'matched';
  if (this.reconciliation.discrepancies.length > 0) return 'pending_resolution';
  return 'unmatched';
});

// Virtual for payment age
PaymentSchema.virtual('paymentAge').get(function() {
  const now = new Date();
  const created = this.createdAt || this.audit.initiatedAt;
  const diffTime = now.getTime() - created.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Days
});

// Virtual for risk level
PaymentSchema.virtual('riskLevel').get(function() {
  const riskScore = this.audit.riskScore;

  if (!riskScore) return 'unknown';
  if (riskScore <= 30) return 'low';
  if (riskScore <= 70) return 'medium';
  return 'high';
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for validation and business logic
 */
PaymentSchema.pre('save', function(next) {
  const payment = this;

  // Generate reference code if not provided
  if (!payment.transaction.referenceCode) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    payment.transaction.referenceCode = `PAY${timestamp}${random}`;
  }

  // Validate amount breakdown
  const expectedTotal = payment.amountBreakdown.baseAmount +
                       payment.amountBreakdown.taxes -
                       payment.amountBreakdown.discounts +
                       payment.amountBreakdown.processingFee;

  if (Math.abs(expectedTotal - payment.amountBreakdown.totalAmount) > 0.01) {
    next(new Error('Amount breakdown does not match total amount'));
    return;
  }

  // Validate transaction configuration
  if (payment.transaction.amount <= 0) {
    next(new Error('Transaction amount must be positive'));
    return;
  }

  // Validate billing period
  if (payment.billingPeriod.start > payment.billingPeriod.end) {
    next(new Error('Billing period end date cannot be before start date'));
    return;
  }

  // Audit trail update
  payment.audit.initiatedAt = new Date();

  next();
});

/**
 * Post-save middleware for cleanup and notifications
 */
PaymentSchema.post('save', function(doc) {
  try {
    // Log payment events for monitoring
    console.log(`Payment ${doc.transaction.referenceCode} ${doc.transaction.status}: ${doc.displayAmount}`);

    // Here you could trigger notification services, analytics updates, etc.
  } catch (error) {
    console.error('Error in payment post-save hook:', error.message);
  }
});

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get payments by user
 */
PaymentSchema.static('getByUser', function(userId, status = null, limit = 50) {
  const query = { userId };
  if (status) {
    query['transaction.status'] = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('planId', 'name slug');
});

/**
 * Get payments by subscription
 */
PaymentSchema.static('getBySubscription', function(subscriptionId) {
  return this.find({ subscriptionId })
    .sort({ createdAt: -1 })
    .populate('planId', 'name pricing');
});

/**
 * Get failed payments for retry processing
 */
PaymentSchema.static('getFailedPayments', function(hoursBack = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

  return this.find({
    'transaction.status': 'failed',
    'audit.initiatedAt': { $gte: cutoffDate },
    'audit.retries': { $size: { $lt: 3 } } // Less than 3 retry attempts
  });
});

/**
 * Get payments for reconciliation
 */
PaymentSchema.static('getUnreconciled', function(limit = 100) {
  return this.find({
    'reconciliation.matched': false,
    'transaction.status': 'completed'
  })
  .sort({ createdAt: -1 })
  .limit(limit);
});

/**
 * Get high-risk payments
 */
PaymentSchema.static('getHighRisk', function(score = 70) {
  return this.find({
    'audit.riskScore': { $gte: score },
    'transaction.status': { $ne: 'failed' }
  })
  .sort({ 'audit.riskScore': -1 });
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Process successful payment
 */
PaymentSchema.method('markSuccessful', function(gatewayDetails = {}) {
  this.transaction.status = 'completed';
  this.audit.completedAt = new Date();

  if (gatewayDetails) {
    this.audit.gatewayMetadata = { ...this.audit.gatewayMetadata, ...gatewayDetails };
  }

  return this.save();
});

/**
 * Process failed payment
 */
PaymentSchema.method('markFailed', function(reason, gatewayDetails = {}) {
  this.transaction.status = 'failed';
  this.transaction.failure_reason = reason;
  this.audit.failedAt = new Date();

  // Record retry attempt
  this.audit.retries.push({
    reason,
    success: false,
    responseCode: gatewayDetails.responseCode
  });

  return this.save();
});

/**
 * Add refund
 */
PaymentSchema.method('addRefund', function(amount, reason, refundedBy) {
  const refund = {
    amount: Math.min(amount, this.transaction.amount),
    currency: this.transaction.currency,
    reason,
    refundedBy,
    refundedAt: new Date()
  };

  this.refunds.push(refund);

  // Update transaction status if fully refunded
  const totalRefunded = this.refunds.reduce((sum, r) => sum + r.amount, 0);
  if (totalRefunded >= this.transaction.amount) {
    this.transaction.status = 'fully_refunded';
  } else if (totalRefunded > 0) {
    this.transaction.status = 'partially_refunded';
  }

  return this.save();
});

/**
 * Mark as reconciled
 */
PaymentSchema.method('markReconciled', function() {
  this.reconciliation.matched = true;
  this.reconciliation.matchedAt = new Date();

  return this.save();
});

/**
 * Add reconciliation discrepancy
 */
PaymentSchema.method('addDiscrepancy', function(field, expectedValue, actualValue) {
  this.reconciliation.discrepancies.push({
    field,
    expectedValue,
    actualValue
  });

  return this.save();
});

/**
 * Process webhook event
 */
PaymentSchema.method('addWebhookEvent', function(eventType, eventData, gatewayEventId = null) {
  this.webhooks.push({
    eventType,
    eventData,
    gatewayEventId,
    receivedAt: new Date(),
    processingSuccess: true
  });

  return this.save();
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = mongoose.model('Payment', PaymentSchema);