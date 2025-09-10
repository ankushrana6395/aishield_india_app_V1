/**
 * User Subscription Service
 *
 * Manages user subscription lifecycle, billing cycles, and feature access
 */

// External Dependencies
const mongoose = require('mongoose');

// Internal Dependencies
const UserSubscription = require('../models/UserSubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Course = require('../models/Course');

// Error Classes and Utilities
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  DatabaseError
} = require('../utils/errorHandler');

const Logger = require('../utils/logger');

/**
 * User Subscription Service
 *
 * Handles user subscription management, lifecycle operations, and feature access
 */
class UserSubscriptionService {
  constructor() {
    // Billing cycle configurations
    this.billingCycleMapper = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
      lifetime: null
    };

    // Subscription status configurations
    this.statusFlow = {
      active: ['paused', 'cancelled'],
      trial: ['active', 'cancelled'],
      paused: ['active', 'cancelled'],
      cancelled: ['reactivated'],
      expired: ['reactivated']
    };
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Get user's subscription details
   *
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User's subscription information
   */
  async getUserSubscription(userId, options = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const { includeHistory = false } = options;

      Logger.businessLogger('get_subscription', 'userSubscription', null, {
        transactionId,
        userId,
        options
      });

      // Validate user exists
      this._validateObjectId(userId, 'User ID');
      await this._validateUserExists(userId);

      // Get active subscription
      const activeSubscription = await this._getActiveSubscription(userId);

      // Get subscription history if requested
      let subscriptionHistory = [];
      if (includeHistory) {
        subscriptionHistory = await this._getSubscriptionHistory(userId);
      }

      // Calculate usage and analytics
      const analytics = activeSubscription ?
        await this._calculateSubscriptionUsage(activeSubscription) : {};

      Logger.performanceLogger('getUserSubscription', startTime, 800, { transactionId });

      return {
        success: true,
        data: {
          userId,
          activeSubscription,
          subscriptionHistory,
          analytics,
          summary: {
            hasActiveSubscription: !!activeSubscription,
            remainingDays: this._calculateRemainingDays(activeSubscription),
            renewalDate: activeSubscription?.billing?.nextBillingDate,
            currentHealthScore: analytics.healthScore || 0
          }
        },
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getUserSubscription',
        userId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Subscription retrieval failed');
    }
  }

  /**
   * Create user subscription
   *
   * @param {String} userId - User ID
   * @param {String} planId - Plan ID
   * @param {Object} subscriptionOptions - Subscription configuration
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(userId, planId, subscriptionOptions = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transactionId = this._generateTransactionId();

      Logger.businessLogger('create_subscription', 'userSubscription', null, {
        transactionId,
        userId,
        planId,
        subscriptionOptions
      });

      // Validation chain
      this._validateObjectId(userId, 'User ID');
      this._validateObjectId(planId, 'Plan ID');

      const [user, plan] = await Promise.all([
        this._validateUserExists(userId, session),
        this._validatePlanAvailable(planId, session)
      ]);

      // Check business rules
      await this._validateSubscriptionEligibility(userId, planId, session);

      // Create subscription data
      const subscriptionData = await this._buildSubscriptionData(
        userId, plan, subscriptionOptions, transactionId
      );

      const subscription = new UserSubscription(subscriptionData);
      await subscription.save({ session });

      // Update plan analytics
      await SubscriptionPlan.findByIdAndUpdate(planId, {
        $inc: {
          'analytics.subscriberCount': 1,
          'analytics.activeSubscriptions': 1
        },
        'analytics.lastSubscriptionDate': new Date()
      }, { session });

      // Update user subscription reference
      await User.findByIdAndUpdate(userId, {
        $set: {
          isSubscribed: true,
          'subscription.planId': subscription._id,
          'subscription.status': subscription.subscriptionInfo.status,
          'subscription.endDate': subscription.billing.endDate
        }
      }, { session });

      await session.commitTransaction();

      Logger.performanceLogger('createSubscription', Date.now() - subscriptionData.audit.initiatedAt, 2000, { transactionId });

      return {
        success: true,
        data: await this._populateSubscription(subscription._id),
        message: 'Subscription created successfully',
        transactionId
      };

    } catch (error) {
      await session.abortTransaction();

      Logger.errorLogger(error, {
        operation: 'createSubscription',
        userId,
        planId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Subscription creation failed');
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel user subscription
   *
   * @param {String} userId - User ID
   * @param {String} subscriptionId - Subscription ID
   * @param {Object} cancellationOptions - Cancellation options
   * @returns {Promise<Object>} Cancellation confirmation
   */
  async cancelSubscription(userId, subscriptionId, cancellationOptions = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('cancel_subscription', 'userSubscription', subscriptionId, {
        transactionId,
        userId,
        cancellationOptions
      });

      // Validation
      this._validateObjectId(userId, 'User ID');
      this._validateObjectId(subscriptionId, 'Subscription ID');

      const subscription = await UserSubscription.findById(subscriptionId);
      if (!subscription) {
        throw new NotFoundError('User Subscription');
      }

      // Verify ownership
      if (subscription.userId.toString() !== userId) {
        throw new AuthorizationError('Unable to cancel subscription');
      }

      // Validate cancellation eligibility
      await this._validateCancellationEligibility(subscription);

      // Process cancellation
      const cancellationData = {
        status: 'cancelled',
        cancelledDate: new Date(),
        cancellationReason: cancellationOptions.reason,
        effectiveCancellationDate: this._calculateEffectiveCancellationDate(
          subscription, cancellationOptions
        )
      };

      // Update subscription
      await UserSubscription.findByIdAndUpdate(subscriptionId, {
        'subscriptionInfo.status': 'cancelled',
        'billing.cancellationPending': true,
        'billing.cancellationDate': new Date(),
        'billing.effectiveCancellationDate': cancellationData.effectiveCancellationDate,
        'audit.cancelledAt': new Date(),
        'audit.cancellationReason': cancellationOptions.reason,
        $set: {
          'audit.updatedAt': new Date()
        }
      });

      // Update user status (keep access until end of billing period)
      await User.findByIdAndUpdate(userId, {
        $set: {
          'subscription.cancellationPending': true,
          'subscription.cancellationDate': new Date()
        }
      });

      Logger.performanceLogger('cancelSubscription', startTime, 1200, { transactionId });

      return {
        success: true,
        data: {
          subscriptionId,
          cancelled: true,
          effectiveCancellationDate: cancellationData.effectiveCancellationDate,
          retainAccessUntil: cancellationData.effectiveCancellationDate
        },
        message: 'Subscription cancelled successfully',
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'cancelSubscription',
        userId,
        subscriptionId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Subscription cancellation failed');
    }
  }

  /**
   * Pause user subscription
   *
   * @param {String} userId - User ID
   * @param {String} subscriptionId - Subscription ID
   * @param {Object} pauseOptions - Pause options
   * @returns {Promise<Object>} Pause confirmation
   */
  async pauseSubscription(userId, subscriptionId, pauseOptions = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const subscription = await UserSubscription.findById(subscriptionId);
      if (!subscription || subscription.userId.toString() !== userId) {
        throw new NotFoundError('Subscription');
      }

      if (subscription.subscriptionInfo.status !== 'active') {
        throw new ValidationError('Subscription must be active to pause');
      }

      const pauseDays = Math.min(pauseOptions.days || 7, 90); // Max 90 days pause
      const pauseStartDate = new Date();
      const pauseEndDate = new Date(pauseStartDate.getTime() + pauseDays * 24 * 60 * 60 * 1000);

      await UserSubscription.findByIdAndUpdate(subscriptionId, {
        'subscriptionInfo.status': 'paused',
        'billing.pauseStartDate': pauseStartDate,
        'billing.pauseEndDate': pauseEndDate,
        'billing.endDate': pauseEndDate, // Extend end date
        $set: {
          'audit.updatedAt': new Date()
        }
      });

      Logger.performanceLogger('pauseSubscription', startTime, 800, { transactionId });

      return {
        success: true,
        data: {
          subscriptionId,
          paused: true,
          pauseStartDate,
          pauseEndDate,
          resumeDate: pauseEndDate
        },
        message: 'Subscription paused successfully',
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'pauseSubscription',
        userId,
        subscriptionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Subscription pause failed');
    }
  }

  // ============================================================================
  // COURSE ACCESS MANAGEMENT
  // ============================================================================

  /**
   * Check user's access to a course
   *
   * @param {String} userId - User ID
   * @param {String} courseId - Course ID
   * @returns {Promise<Object>} Access result
   */
  async checkCourseAccess(userId, courseId) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const subscription = await this._getActiveSubscription(userId);

      if (!subscription) {
        return {
          success: false,
          hasAccess: false,
          reason: 'No active subscription',
          message: 'User has no active subscription'
        };
      }

      // Check if subscription has expired
      if (new Date() > subscription.billing.endDate) {
        return {
          success: false,
          hasAccess: false,
          reason: 'Subscription expired',
          message: 'User subscription has expired'
        };
      }

      // Check if user has access to this course
      const courseAccess = subscription.courses.find(
        course => course.courseId.toString() === courseId
      );

      const hasAccess = !!courseAccess;
      const reason = hasAccess ? 'valid_subscription' : 'course_not_included';

      Logger.performanceLogger('checkCourseAccess', startTime, 300, { transactionId });

      return {
        success: true,
        hasAccess,
        reason,
        message: hasAccess ? 'Access granted' : 'Course not included in subscription',
        courseAccess: hasAccess ? courseAccess : null,
        subscription: {
          planName: subscription.subscriptionInfo.name,
          billingCycle: subscription.subscriptionInfo.billingCycle,
          remainingDays: this._calculateRemainingDays(subscription)
        }
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'checkCourseAccess',
        userId,
        courseId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Course access check failed');
    }
  }

  /**
   * Get user's accessible courses
   *
   * @param {String} userId - User ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} User's accessible courses
   */
  async getAccessibleCourses(userId, filters = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const subscription = await this._getActiveSubscription(userId);

      if (!subscription) {
        return {
          success: false,
          data: [],
          message: 'No active subscription'
        };
      }

      // Build course IDs from subscription
      const courseIds = subscription.courses.map(course => course.courseId);

      // Get course details with filters
      const query = { _id: { $in: courseIds } };

      if (filters.difficulty) {
        query.difficulty = filters.difficulty;
      }

      if (filters.category) {
        query['categories.name'] = filters.category;
      }

      if (filters.status === 'completed') {
        query._id = {
          $in: subscription.courses
            .filter(course => course.completedDate)
            .map(course => course.courseId)
        };
      }

      const courses = await Course.find(query)
        .select('title slug description instructor difficulty duration categories enrollments')
        .sort({ title: 1 });

      Logger.performanceLogger('getAccessibleCourses', startTime, 600, { transactionId });

      return {
        success: true,
        data: courses,
        summary: {
          totalCourses: courseIds.length,
          filteredCourses: courses.length,
          completedCourses: subscription.courses.filter(c => c.completedDate).length
        },
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getAccessibleCourses',
        userId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Accessible courses retrieval failed');
    }
  }

  // ============================================================================
  // SUBSCRIPTION ANALYTICS
  // ============================================================================

  /**
   * Get subscription analytics for admin
   *
   * @param {Object} filters - Analytics filters
   * @returns {Promise<Object>} Subscription analytics
   */
  async getSubscriptionAnalytics(filters = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const matchStage = this._buildAnalyticsMatchStage(filters);

      const analytics = await UserSubscription.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: { $cond: [{ $eq: ['$subscriptionInfo.status', 'active'] }, 1, 0] }
            },
            cancelledSubscriptions: {
              $sum: { $cond: [{ $eq: ['$subscriptionInfo.status', 'cancelled'] }, 1, 0] }
            },
            totalRevenue: { $sum: '$subscriptionInfo.price' },
            byPlan: {
              $push: '$planId'
            },
            byBillingCycle: {
              $push: '$subscriptionInfo.billingCycle'
            }
          }
        },
        {
          $project: {
            totalSubscriptions: 1,
            activeSubscriptions: 1,
            cancelledSubscriptions: 1,
            churnRate: {
              $multiply: [
                { $divide: ['$cancelledSubscriptions', '$totalSubscriptions'] },
                100
              ]
            },
            averageRevenuePerUser: { $divide: ['$totalRevenue', '$totalSubscriptions'] },
            byPlan: { $size: { $setUnion: '$byPlan' } },
            byBillingCycle: { $size: { $setUnion: '$byBillingCycle' } }
          }
        }
      ]);

      Logger.performanceLogger('getSubscriptionAnalytics', startTime, 800, { transactionId });

      return {
        success: true,
        data: analytics[0] || {
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          cancelledSubscriptions: 0,
          churnRate: 0,
          averageRevenuePerUser: 0
        },
        filters,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getSubscriptionAnalytics',
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Analytics retrieval failed');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  _generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `sub_${timestamp}_${random}`;
  }

  _validateObjectId(id, label) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`${label} is not a valid ObjectId`);
    }
  }

  async _validateUserExists(userId, session = null) {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async _validatePlanAvailable(planId, session = null) {
    const plan = await SubscriptionPlan.findById(planId).session(session);
    if (!plan || !plan.business?.isActive || !plan.business?.isVisible) {
      throw new NotFoundError('Subscription Plan');
    }
    return plan;
  }

  async _validateSubscriptionEligibility(userId, planId, session) {
    // Check if user already has an active subscription
    const existingSubscription = await UserSubscription.findOne({
      userId,
      planId,
      'subscriptionInfo.status': { $in: ['active', 'trial'] }
    }).session(session);

    if (existingSubscription) {
      throw new ConflictError('User already has an active subscription to this plan');
    }
  }

  async _validateCancellationEligibility(subscription) {
    if (subscription.subscriptionInfo.status === 'cancelled') {
      throw new ValidationError('Subscription is already cancelled');
    }

    if (subscription.audit.cancellationReason) {
      throw new ValidationError('Subscription cancellation is being processed');
    }
  }

  async _getActiveSubscription(userId) {
    return await UserSubscription.findOne({
      userId,
      'subscriptionInfo.status': { $in: ['active', 'trial', 'paused'] },
      'billing.endDate': { $gt: new Date() }
    }).populate('planId', 'name slug pricing business');
  }

  async _getSubscriptionHistory(userId) {
    return await UserSubscription.find({ userId })
      .populate('planId', 'name slug pricing.business')
      .sort({ 'audit.createdAt': -1 })
      .limit(10);
  }

  async _calculateSubscriptionUsage(subscription) {
    const courses = subscription.courses;
    const totalCourses = courses.length;
    const completedCourses = courses.filter(c => c.completedDate).length;
    const progressPercentage = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

    return {
      totalCourses,
      completedCourses,
      progressPercentage,
      healthScore: this._calculateHealthScore(subscription, progressPercentage)
    };
  }

  _calculateHealthScore(subscription, progress) {
    let score = 50; // Base score

    // Add points for progress
    score += Math.min(progress, 50); // Max 50 points for progress

    // Add points for active usage
    if (subscription.usage.loginFrequency > 3) score += 20;
    if (subscription.usage.engagementScore > 70) score += 20;

    // Deduct points for negative factors
    if (subscription.subscriptionInfo.status === 'paused') score -= 30;
    if (subscription.renewals.failedRenewalCount > 0) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  _calculateRemainingDays(subscription) {
    if (!subscription) return 0;

    const now = new Date();
    const endDate = subscription.billing.endDate;
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  async _buildSubscriptionData(userId, plan, options, transactionId) {
    return {
      userId,
      planId: plan._id,
      subscriptionInfo: {
        name: plan.name,
        slug: plan.slug,
        billingCycle: plan.pricing?.billingCycle || 'monthly',
        price: plan.pricing?.price || 0,
        currency: plan.pricing?.currency || 'INR',
        status: 'active',
        features: plan.features || {}
      },
      billing: {
        startDate: new Date(),
        endDate: this._calculateEndDate(plan),
        billingCycle: plan.pricing?.billingCycle || 'monthly'
      },
      paymentMethod: options.paymentMethod || {},
      audit: {
        initiatedAt: new Date(),
        createdAt: new Date()
      },
      courses: this._initializeCourses(plan)
    };
  }

  _calculateEndDate(plan) {
    const billingCycle = plan.pricing?.billingCycle || 'monthly';
    const startDate = new Date();

    switch (billingCycle) {
      case 'monthly':
        return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'quarterly':
        return new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      case 'yearly':
        return new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
      case 'lifetime':
        return new Date(startDate.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years for practical purposes
      default:
        return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  _initializeCourses(plan) {
    return (plan.includedCourses || []).map(course => ({
      courseId: course.courseId,
      enrolledDate: new Date()
    }));
  }

  _calculateEffectiveCancellationDate(subscription, options) {
    const endOfPeriod = options.immediate || false;
    if (endOfPeriod) {
      return subscription.billing.endDate;
    }

    // Respect existing billing cycle
    return this._calculateEffectiveBillingEnd(subscription);
  }

  _calculateEffectiveBillingEnd(subscription) {
    const billingCycle = subscription.subscriptionInfo.billingCycle;
    const lastBillingDate = new Date();

    switch (billingCycle) {
      case 'monthly':
        lastBillingDate.setMonth(lastBillingDate.getMonth() + 1);
        break;
      case 'quarterly':
        lastBillingDate.setMonth(lastBillingDate.getMonth() + 3);
        break;
      case 'yearly':
        lastBillingDate.setFullYear(lastBillingDate.getFullYear() + 1);
        break;
    }

    return lastBillingDate;
  }

  _buildAnalyticsMatchStage(filters) {
    const match = {};

    if (filters.status) {
      match['subscriptionInfo.status'] = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      match['audit.createdAt'] = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    if (filters.planId) {
      match.planId = filters.planId;
    }

    return match;
  }

  async _populateSubscription(subscriptionId) {
    return await UserSubscription.findById(subscriptionId)
      .populate('userId', 'name email')
      .populate('planId', 'name slug pricing.business');
  }

  _handleServiceError(error, defaultMessage) {
    if (error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof ConflictError) {
      return error;
    }

    Logger.error('User Subscription Service Error', {
      message: error.message,
      stack: error.stack,
      defaultMessage
    });

    return new DatabaseError(`${defaultMessage}: ${error.message}`);
  }
}

module.exports = new UserSubscriptionService();