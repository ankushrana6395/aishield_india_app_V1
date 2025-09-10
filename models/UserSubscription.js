/**
 * User Subscription Model
 *
 * Manages user subscription lifecycle and detailed tracking
 */

// External Dependencies
const mongoose = require('mongoose');

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

/**
 * Subscription Details Sub-Schema
 * Core subscription information
 */
const SubscriptionInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'trial', 'grace', 'pending_renewal', 'cancelled', 'expired', 'suspended', 'paused'],
    default: 'active',
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * Billing Information Sub-Schema
 * Subscription billing dates and periods
 */
const BillingSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  nextBillingDate: {
    type: Date,
    comment: 'Next recurring payment date'
  },
  paidThroughDate: {
    type: Date,
    comment: 'Date subscription is paid through'
  },
  trialEndDate: {
    type: Date,
    comment: 'Trial period end date'
  },

  // Billing pauses and cancellations
  pausesRemaining: {
    type: Number,
    min: 0,
    default: 0,
    comment: 'Number of pause periods remaining'
  },
  pauseStartDate: {
    type: Date,
    comment: 'Current pause start date'
  },
  pauseEndDate: {
    type: Date,
    comment: 'Current pause end date'
  },

  // Cancellation details
  cancellationRequested: {
    type: Boolean,
    default: false
  },
  cancellationDate: {
    type: Date,
    comment: 'Requested cancellation date'
  },
  effectiveCancellationDate: {
    type: Date,
    comment: 'Effective cancellation date (end of current period)'
  }
}, { _id: false });

/**
 * Payment Method Information Sub-Schema
 */
const PaymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet'],
    required: true
  },
  referenceId: {
    type: String,
    required: true,
    comment: 'Gateway-specific payment method reference'
  },
  maskedNumber: {
    type: String,
    trim: true,
    comment: 'Masked card number or UPI ID for display'
  },
  cardBrand: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'diners', 'rupay', 'discover'],
    comment: 'Card brand (if applicable)'
  },
  expiryMonth: {
    type: Number,
    min: 1,
    max: 12,
    comment: 'Card expiry month'
  },
  expiryYear: {
    type: Number,
    min: new Date().getFullYear(),
    max: new Date().getFullYear() + 20,
    comment: 'Card expiry year'
  },
  isDefault: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Usage Analytics Sub-Schema
 * Track user engagement and usage patterns
 */
const UsageSchema = new mongoose.Schema({
  coursesAccessed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  lecturesCompleted: {
    type: Number,
    min: 0,
    default: 0
  },
  certificatesEarned: {
    type: Number,
    min: 0,
    default: 0
  },
  quizzesAttempted: {
    type: Number,
    min: 0,
    default: 0
  },
  totalStudyTime: {
    type: Number,
    min: 0,
    default: 0,
    comment: 'Total study time in minutes'
  },

  // Engagement metrics
  loginFrequency: {
    type: Number,
    min: 0,
    default: 0,
    comment: 'Average logins per week'
  },
  engagementScore: {
    type: Number,
    min: 0,
    max: 1000,
    default: 0,
    comment: 'Composite engagement score'
  },

  // Content access patterns
  peakAccessHours: [{
    hourOfDay: {
      type: Number,
      min: 0,
      max: 23
    },
    accessCount: {
      type: Number,
      min: 0
    },
    _id: false
  }],
  accessDeviceTypes: [{
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet']
    },
    accessCount: {
      type: Number,
      min: 0
    },
    lastAccess: Date,
    _id: false
  }]
}, { _id: false });

/**
 * Renewal Information Sub-Schema
 * Track renewal attempts and history
 */
const RenewalSchema = new mongoose.Schema({
  renewalAttempts: [{
    attemptDate: {
      type: Date,
      default: Date.now
    },
    success: {
      type: Boolean,
      default: false
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 200
    },
    paymentMethodUsed: String,
    amountAttempted: {
      type: Number,
      min: 0
    },
    _id: false
  }],
  failedRenewalCount: {
    type: Number,
    min: 0,
    default: 0
  },
  lastRenewalDate: {
    type: Date
  },
  nextRetryDate: {
    type: Date,
    comment: 'Next automatic renewal retry date'
  },
  maxRenewalAttempts: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  }
}, { _id: false });

// ============================================================================
// MAIN SCHEMA
// ============================================================================

/**
 * User Subscription Schema
 * Comprehensive subscription management with detailed analytics
 */
const UserSubscriptionSchema = new mongoose.Schema({
  // Core References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
    index: true
  },

  // Subscription Details
  subscriptionInfo: {
    type: SubscriptionInfoSchema,
    required: true
  },

  // Billing Information
  billing: {
    type: BillingSchema,
    required: true
  },

  // Payment Method Information
  paymentMethod: {
    type: PaymentMethodSchema,
    required: true
  },

  // Usage and Engagement
  usage: {
    type: UsageSchema,
    default: () => ({})
  },

  // Renewal Tracking
  renewals: {
    type: RenewalSchema,
    default: () => ({})
  },

  // Feature Access Tracking
  featureAccess: {
    downloadsUsed: {
      type: Number,
      min: 0,
      default: 0
    },
    downloadsLimit: {
      type: Number,
      min: 0,
      default: 0
    },
    supportRequests: {
      type: Number,
      min: 0,
      default: 0
    },
    supportLimit: {
      type: Number,
      min: 0,
      default: 0
    },
    mentoringSessionsUsed: {
      type: Number,
      min: 0,
      default: 0
    },
    mentoringSessionsLimit: {
      type: Number,
      min: 0,
      default: 0
    },
    webinarsAttended: {
      type: Number,
      min: 0,
      default: 0
    },
    webinarsLimit: {
      type: Number,
      min: 0,
      default: 0
    }
  },

  // Course Access History
  courses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    enrolledDate: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    completedDate: Date,
    certificateIssued: {
      type: Boolean,
      default: false
    },
    certificateId: String,
    _id: false
  }],

  // Audit Information
  audit: {
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    cancelledAt: Date,
    cancellationReason: {
      type: String,
      enum: ['user_request', 'payment_failed', 'plan_terminated', 'account_closed'],
      trim: true
    },
    adminCancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      comment: 'Admin who cancelled (if applicable)'
    },
    version: {
      type: Number,
      min: 1,
      default: 1
    }
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
UserSubscriptionSchema.index({ userId: 1 });
UserSubscriptionSchema.index({ planId: 1 });
UserSubscriptionSchema.index({ 'subscriptionInfo.status': 1 });
UserSubscriptionSchema.index({ 'billing.endDate': 1 });
UserSubscriptionSchema.index({ 'audit.createdAt': -1 });

// Compound indexes for complex queries
UserSubscriptionSchema.index({
  userId: 1,
  'subscriptionInfo.status': 1
});

UserSubscriptionSchema.index({
  'billing.endDate': 1,
  'subscriptionInfo.status': 1
});

UserSubscriptionSchema.index({
  planId: 1,
  'subscriptionInfo.status': 1
});

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for days remaining in subscription
UserSubscriptionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const endDate = this.billing.endDate;

  if (!endDate) return 0;

  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
});

// Virtual for subscription health score
UserSubscriptionSchema.virtual('healthScore').get(function() {
  let score = 0;

  // Basic activity (40% weight)
  if (this.usage.loginFrequency > 0) score += 20;
  if (this.courses.length > 0) score += 20;

  // Engagement (30% weight)
  if (this.usage.engagementScore > 500) score += 15;
  if (this.lecturesCompleted > 10) score += 10;
  if (this.courses.some(c => c.progress > 50)) score += 5;

  // Renewal behavior (30% weight)
  if (this.subscriptionInfo.autoRenew) score += 15;
  if (this.renewals.failedRenewalCount === 0) score += 15;

  return Math.min(100, score);
});

// Virtual for renewal risk level
UserSubscriptionSchema.virtual('renewalRisk').get(function() {
  const daysLeft = this.daysRemaining;
  const failedRenewals = this.renewals.failedRenewalCount;
  const healthScore = this.healthScore;

  if (daysLeft <= 0) return 'expired';
  if (failedRenewals >= 2) return 'high_risk';
  if (healthScore < 30) return 'moderate_risk';
  if (daysLeft <= 7) return 'low_risk';

  return 'healthy';
});

// Virtual for is active
UserSubscriptionSchema.virtual('isActive').get(function() {
  const status = this.subscriptionInfo.status;
  const now = new Date();
  const endDate = this.billing.endDate;

  return (status === 'active' || status === 'trial') &&
         endDate && endDate > now;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for business logic validation
 */
UserSubscriptionSchema.pre('save', function(next) {
  const subscription = this;

  // Update audit tracking
  if (!subscription.isNew) {
    subscription.audit.updatedAt = new Date();
    subscription.audit.version += 1;
  }

  // Validate date consistency
  if (subscription.billing.startDate > subscription.billing.endDate) {
    next(new Error('End date cannot be before start date'));
    return;
  }

  // Auto-calculate next billing date based on cycle
  if (!subscription.billing.nextBillingDate && subscription.isActive) {
    const billingCycle = subscription.subscriptionInfo.billingCycle;
    let nextDate = new Date(subscription.billing.startDate);

    switch (billingCycle) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'lifetime':
        nextDate = null; // No next billing for lifetime
        break;
    }

    subscription.billing.nextBillingDate = nextDate;
  }

  // Update usage metrics
  if (subscription.courses.length > 0) {
    subscription.usage.coursesAccessed = subscription.courses.map(c => c.courseId);
  }

  next();
});

/**
 * Post-save middleware for cascade updates
 */
UserSubscriptionSchema.post('save', async function(doc) {
  try {
    // Update subscription count in plan
    const SubscriptionPlan = mongoose.model('SubscriptionPlan');
    await SubscriptionPlan.updateOne(
      { _id: doc.planId },
      {
        $inc: {
          subscriberCount: doc.subscriptionInfo.status === 'active' ? 1 : 0,
          totalSubscriptions: 1
        }
      }
    );
  } catch (error) {
    console.error('Error updating plan analytics:', error.message);
  }
});

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get active subscriptions by user
 */
UserSubscriptionSchema.static('getActiveByUser', function(userId) {
  return this.find({
    userId,
    'subscriptionInfo.status': { $in: ['active', 'trial'] },
    'billing.endDate': { $gt: new Date() }
  });
});

/**
 * Get subscriptions ending soon
 */
UserSubscriptionSchema.static('getEndingSoon', function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);

  return this.find({
    'subscriptionInfo.status': 'active',
    'billing.endDate': {
      $gte: new Date(),
      $lte: cutoffDate
    }
  });
});

/**
 * Get failed renewal subscriptions
 */
UserSubscriptionSchema.static('getFailedRenewals', function() {
  return this.find({
    'renewals.failedRenewalCount': { $gte: 1 },
    'subscriptionInfo.status': { $in: ['active', 'grace', 'pending_renewal'] }
  });
});

/**
 * Get subscriptions by plan
 */
UserSubscriptionSchema.static('getByPlan', function(planId, status = null) {
  const query = { planId };
  if (status) {
    query['subscriptionInfo.status'] = status;
  }

  return this.find(query);
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Cancel subscription
 */
UserSubscriptionSchema.method('cancel', function(reason, cancelledBy) {
  this.subscriptionInfo.status = 'cancelled';
  this.subscriptionInfo.autoRenew = false;
  this.audit.cancelledAt = new Date();

  if (reason) {
    this.audit.cancellationReason = reason;
  }

  if (cancelledBy) {
    this.audit.adminCancelledBy = cancelledBy;
  }

  return this.save();
});

/**
 * Pause subscription
 */
UserSubscriptionSchema.method('pause', function(days) {
  this.subscriptionInfo.status = 'paused';
  this.billing.pauseStartDate = new Date();

  const pauseEndDate = new Date();
  pauseEndDate.setDate(pauseEndDate.getDate() + (days || 30));
  this.billing.pauseEndDate = pauseEndDate;

  // Extend end date by pause duration
  this.billing.endDate = new Date(
    this.billing.endDate.getTime() + (days || 30) * 24 * 60 * 60 * 1000
  );

  return this.save();
});

/**
 * Resume subscription
 */
UserSubscriptionSchema.method('resume', function() {
  if (this.subscriptionInfo.status === 'paused') {
    this.subscriptionInfo.status = 'active';
    this.billing.pauseStartDate = null;
    this.billing.pauseEndDate = null;
    this.billing.pausesRemaining -= 1;
  }

  return this.save();
});

/**
 * Add course enrollment
 */
UserSubscriptionSchema.method('enrollInCourse', function(courseId) {
  const existingIndex = this.courses.findIndex(
    course => course.courseId.toString() === courseId.toString()
  );

  if (existingIndex === -1) {
    this.courses.push({
      courseId,
      enrolledDate: new Date()
    });
  }

  return this.save();
});

/**
 * Update course progress
 */
UserSubscriptionSchema.method('updateCourseProgress', function(courseId, progress) {
  const course = this.courses.find(
    course => course.courseId.toString() === courseId.toString()
  );

  if (course) {
    course.progress = Math.min(100, Math.max(0, progress));

    if (progress >= 100) {
      course.completedDate = new Date();
    }
  }

  return this.save();
});

/**
 * Record payment failed
 */
UserSubscriptionSchema.method('recordPaymentFailure', function(reason, amount) {
  this.renewals.failedRenewalCount += 1;
  this.renewals.renewalAttempts.push({
    attemptDate: new Date(),
    success: false,
    failureReason: reason,
    amountAttempted: amount
  });

  // Calculate next retry date (exponential backoff)
  const retryDelay = Math.pow(2, this.renewals.failedRenewalCount) * 24 * 60 * 60 * 1000; // Days
  this.renewals.nextRetryDate = new Date(Date.now() + retryDelay);

  // Check if subscription should enter grace period or be suspended
  if (this.renewals.failedRenewalCount >= this.renewals.maxRenewalAttempts) {
    this.subscriptionInfo.status = 'suspended';
  } else {
    this.subscriptionInfo.status = 'grace';
  }

  return this.save();
});

/**
 * Process successful payment
 */
UserSubscriptionSchema.method('processSuccessfulPayment', function(amount, paymentMethod) {
  this.renewals.failedRenewalCount = 0;
  this.renewals.lastRenewalDate = new Date();
  this.renewals.renewalAttempts.push({
    attemptDate: new Date(),
    success: true,
    paymentMethodUsed: paymentMethod,
    amountAttempted: amount
  });

  // Extend subscription period
  this.extendSubscription();

  return this.save();
});

/**
 * Extend subscription by one billing cycle
 */
UserSubscriptionSchema.method('extendSubscription', function() {
  const billingCycle = this.subscriptionInfo.billingCycle;

  if (billingCycle === 'lifetime') return; // Lifetime subscriptions don't extend

  const currentEndDate = this.billing.endDate;
  let newEndDate = new Date(currentEndDate);

  switch (billingCycle) {
    case 'monthly':
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      break;
    case 'quarterly':
      newEndDate.setMonth(newEndDate.getMonth() + 3);
      break;
    case 'yearly':
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      break;
  }

  this.billing.endDate = newEndDate;
  this.billing.nextBillingDate = new Date(newEndDate);
  this.subscriptionInfo.status = 'active';
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = mongoose.model('UserSubscription', UserSubscriptionSchema);