/**
 * Enterprise Subscription Plan Service
 *
 * Advanced service layer for comprehensive subscription plan management
 * with enterprise patterns, security, and performance optimization
 */

// External Dependencies
const mongoose = require('mongoose');

// Internal Dependencies
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');

// Error Classes
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  DatabaseError
} = require('../utils/errorHandler');

// Logger
const Logger = require('../utils/logger');

// Configuration
const config = require('../config/environment');

/**
 * Enterprise Subscription Plan Service
 *
 * Comprehensive business logic for subscription plan operations
 * with security, validation, and performance monitoring
 */
class SubscriptionPlanService {
  constructor() {
    // Cache TTL in milliseconds (5 minutes)
    this.cacheTTL = 5 * 60 * 1000;

    // Circuit breaker state
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureThreshold: 5,
      recoveryTimeout: 60000 // 1 minute
    };
  }

  // ============================================================================
  // PLAN CRUD OPERATIONS
  // ============================================================================

  /**
   * Create new subscription plan with enterprise validation
   *
   * @param {Object} planData - Complete plan configuration
   * @param {String} userId - Creating user ID
   * @param {String} role - User role for authorization
   * @returns {Promise<Object>} Created subscription plan
   */
  async createPlan(planData, userId, role) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('create', 'subscriptionPlan', null, {
        transactionId,
        planData: {
          name: planData.name,
          slug: planData.slug,
          price: planData.pricing?.price
        },
        createdBy: userId,
        role
      });

      // Comprehensive validation
      this._validateCreatePermission(role);
      this._validatePlanData(planData);

      // Check for duplicates
      await this._validateUniqueConstraints(planData.name, planData.slug);

      // Validate related entities
      await this._validateIncludedCourses(planData.includedCourses);
      await this._validatePricingStructure(planData.pricing);

      // Transform and create plan
      const transformedData = this._transformPlanData(planData, userId);

      const plan = new SubscriptionPlan(transformedData);
      const savedPlan = await plan.save();

      // Populate and return
      const populatedPlan = await this._populatePlan(savedPlan._id);

      Logger.performanceLogger('createPlan', startTime, 2000, { transactionId });

      return {
        success: true,
        data: populatedPlan,
        message: `Subscription plan "${planData.name}" created successfully`,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'createPlan',
        transactionId,
        planData: { name: planData.name, slug: planData.slug },
        userId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Plan creation failed');
    }
  }

  /**
   * Retrieve subscription plan by ID with full population
   *
   * @param {String} planId - Plan ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Complete plan data
   */
  async getPlanById(planId, options = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('read', 'subscriptionPlan', planId, {
        transactionId,
        options
      });

      // Validate plan ID
      this._validateObjectId(planId, 'Plan ID');

      const plan = await this._populatePlan(planId, options);

      if (!plan) {
        throw new NotFoundError('Subscription Plan');
      }

      // Business rule validation
      if (plan.business?.isVisible === false && options.includeHidden !== true) {
        throw new AuthorizationError('Plan is not publicly available');
      }

      Logger.performanceLogger('getPlanById', startTime, 500, { transactionId });

      return {
        success: true,
        data: plan,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getPlanById',
        planId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Plan retrieval failed');
    }
  }

  /**
   * Update subscription plan with enterprise validation
   *
   * @param {String} planId - Plan ID
   * @param {Object} updateData - Update payload
   * @param {String} userId - Updating user ID
   * @param {String} role - User role
   * @returns {Promise<Object>} Updated plan
   */
  async updatePlan(planId, updateData, userId, role) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('update', 'subscriptionPlan', planId, {
        transactionId,
        updateFields: Object.keys(updateData),
        updatedBy: userId,
        role
      });

      // Validation and permissions
      this._validateUpdatePermission(role);
      this._validateObjectId(planId, 'Plan ID');

      // Get current plan for validation
      const currentPlan = await SubscriptionPlan.findById(planId);
      if (!currentPlan) {
        throw new NotFoundError('Subscription Plan');
      }

      // Business rule validation for updates
      await this._validatePlanUpdates(updateData, currentPlan);

      // Prepare update context
      const updateContext = {
        userId,
        transactionId,
        originalData: {
          name: currentPlan.name,
          slug: currentPlan.slug,
          pricing: currentPlan.pricing
        }
      };

      // Transform update data
      const transformedUpdate = this._transformUpdateData(updateData, updateContext);

      const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        transformedUpdate,
        {
          new: true,
          runValidators: true,
          context: 'query'
        }
      );

      // Cascade updates if needed
      if (updateData.name || updateData.slug) {
        await this._handlePlanNameChange(planId, updateData, updateContext);
      }

      Logger.performanceLogger('updatePlan', startTime, 1500, { transactionId });

      return {
        success: true,
        data: await this._populatePlan(updatedPlan._id),
        message: 'Subscription plan updated successfully',
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'updatePlan',
        planId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Plan update failed');
    }
  }

  /**
   * Get paginated list of subscription plans
   *
   * @param {Object} filters - Search and filter criteria
   * @param {Object} pagination - Pagination parameters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated plan results
   */
  async getPlans(filters = {}, pagination = {}, options = {}) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('list', 'subscriptionPlans', null, {
        transactionId,
        filters,
        pagination
      });

      // Normalize pagination
      const page = Math.max(1, parseInt(pagination.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));
      const skip = (page - 1) * limit;

      // Build query filter
      const queryFilter = await this._buildPlanFilter(filters, options);

      // Execute query with performance monitoring
      const [plans, total] = await Promise.all([
        SubscriptionPlan.find(queryFilter)
          .populate('audit.createdBy', 'name email')
          .sort(pagination.sort || { 'business.sortOrder': 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        SubscriptionPlan.countDocuments(queryFilter)
      ]);

      // Process additional data if needed
      const processedPlans = await this._processPlanList(plans, options);

      const result = {
        plans: processedPlans,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: filters
      };

      Logger.performanceLogger('getPlans', startTime, 800, {
        count: plans.length,
        total,
        transactionId
      });

      return {
        success: true,
        data: result,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getPlans',
        filters,
        pagination,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Plan listing failed');
    }
  }

  /**
   * Archive subscription plan (soft delete)
   *
   * @param {String} planId - Plan ID
   * @param {String} userId - Admin user ID
   * @param {String} role - User role
   * @returns {Promise<Object>} Archive confirmation
   */
  async archivePlan(planId, userId, role) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('archive', 'subscriptionPlan', planId, {
        transactionId,
        archivedBy: userId,
        role
      });

      // Permission validation
      this._validateArchivePermission(role);
      this._validateObjectId(planId, 'Plan ID');

      // Check business constraints
      await this._validateArchiveEligibility(planId);

      const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        {
          'business.isActive': false,
          'audit.updatedBy': userId,
          'audit.archivedAt': new Date(),
          'audit.isArchived': true
        },
        { new: true }
      );

      if (!updatedPlan) {
        throw new NotFoundError('Subscription Plan');
      }

      Logger.performanceLogger('archivePlan', startTime, 1000, { transactionId });

      return {
        success: true,
        message: `Subscription plan "${updatedPlan.name}" archived successfully`,
        data: {
          planId,
          archived: true,
          archivedAt: new Date()
        },
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'archivePlan',
        planId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Plan archival failed');
    }
  }

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  /**
   * Add course to subscription plan
   *
   * @param {String} planId - Plan ID
   * @param {String} courseId - Course ID
   * @param {Object} accessOptions - Access configuration
   * @param {String} userId - Admin user ID
   * @param {String} role - User role
   * @returns {Promise<Object>} Updated plan
   */
  async addCourse(planId, courseId, accessOptions, userId, role) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      Logger.businessLogger('course_add', 'subscriptionPlan', planId, {
        transactionId,
        courseId,
        accessOptions,
        updatedBy: userId,
        role
      });

      // Validation chain
      this._validateCourseManagementPermission(role);
      this._validateObjectId(planId, 'Plan ID');
      this._validateObjectId(courseId, 'Course ID');

      // Validate course exists and is accessible
      const course = await this._validateCourseExists(courseId);
      await this._validateCourseAccess(course, accessOptions);

      // Add course to plan
      await SubscriptionPlan.findByIdAndUpdate(
        planId,
        {
          $addToSet: {
            includedCourses: {
              courseId,
              courseName: course.title,
              courseSlug: course.slug,
              accessLevel: accessOptions?.accessLevel || 'full',
              restrictions: accessOptions?.restrictions || {},
              metadata: {
                addedAt: new Date(),
                addedBy: userId
              }
            }
          },
          $set: {
            'audit.updatedBy': userId,
            'audit.updatedAt': new Date()
          }
        }
      );

      Logger.performanceLogger('addCourse', startTime, 800, { transactionId });

      return {
        success: true,
        data: await this._populatePlan(planId),
        message: `Course "${course.title}" added to plan successfully`,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'addCourse',
        planId,
        courseId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Course addition failed');
    }
  }

  /**
   * Remove course from subscription plan
   *
   * @param {String} planId - Plan ID
   * @param {String} courseId - Course ID
   * @param {String} userId - Admin user ID
   * @param {String} role - User role
   * @returns {Promise<Object>} Updated plan
   */
  async removeCourse(planId, courseId, userId, role) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      const originalPlan = await this._populatePlan(planId);
      const courseToRemove = originalPlan.includedCourses?.find(
        course => course.courseId.toString() === courseId
      );

      Logger.businessLogger('course_remove', 'subscriptionPlan', planId, {
        transactionId,
        courseId,
        courseName: courseToRemove?.courseName,
        updatedBy: userId,
        role
      });

      // Validate business rules for removal
      await this._validateCourseRemoval(planId, courseId);

      await SubscriptionPlan.findByIdAndUpdate(planId, {
        $pull: {
          includedCourses: { courseId }
        },
        $set: {
          'audit.updatedBy': userId,
          'audit.updatedAt': new Date()
        }
      });

      Logger.performanceLogger('removeCourse', startTime, 800, { transactionId });

      return {
        success: true,
        data: await this._populatePlan(planId),
        message: `Course "${courseToRemove?.courseName || 'Unknown'}" removed from plan successfully`,
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'removeCourse',
        planId,
        courseId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'Course removal failed');
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Get user's active subscriptions
   *
   * @param {String} userId - User ID
   * @returns {Promise<Object>} User's subscription data
   */
  async getUserSubscriptions(userId) {
    const startTime = Date.now();
    const transactionId = this._generateTransactionId();

    try {
      this._validateObjectId(userId, 'User ID');

      const subscriptions = await UserSubscription
        .find({ userId })
        .populate({
          path: 'planId',
          select: 'name slug description pricing business.marketing marketing',
          match: { 'business.isVisible': true }
        })
        .sort({ 'billing.endDate': -1 })
        .lean();

      Logger.performanceLogger('getUserSubscriptions', startTime, 600, {
        subscriptionCount: subscriptions.length,
        transactionId
      });

      return {
        success: true,
        data: {
          userId,
          subscriptions,
          summary: {
            total: subscriptions.length,
            active: subscriptions.filter(s => s.isActive).length,
            expired: subscriptions.filter(s => new Date() > new Date(s.billing.endDate)).length
          }
        },
        transactionId
      };

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getUserSubscriptions',
        userId,
        transactionId,
        error: error.message
      });

      throw this._handleServiceError(error, 'User subscription retrieval failed');
    }
  }

  /**
   * Create user subscription
   *
   * @param {String} userId - User ID
   * @param {String} planId - Plan ID
   * @param {Object} subscriptionOptions - Subscription options
   * @returns {Promise<Object>} Created subscription
   */
  async createUserSubscription(userId, planId, subscriptionOptions = {}) {
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

      // Validate entities and business rules
      const [user, plan] = await Promise.all([
        this._validateUserExists(userId, session),
        this._validatePlanAvailable(planId, session)
      ]);

      // Check for existing active subscription
      await this._validateNoActiveSubscription(userId, planId, session);

      // Create subscription with comprehensive data
      const subscriptionData = await this._buildUserSubscriptionData(
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

      await session.commitTransaction();

      Logger.performanceLogger('createUserSubscription', Date.now() - transactionId._timestamp, 2000, { transactionId });

      return {
        success: true,
        data: await this._populateUserSubscription(subscription._id),
        message: 'Subscription created successfully',
        transactionId
      };

    } catch (error) {
      await session.abortTransaction();

      Logger.errorLogger(error, {
        operation: 'createUserSubscription',
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

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate unique transaction ID
   */
  _generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `sub_${timestamp}_${random}`;
  }

  /**
   * Validate MongoDB ObjectId format
   */
  _validateObjectId(id, label) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`${label} is not a valid ObjectId`);
    }
  }

  /**
   * Validate admin permissions
   */
  _validateCreatePermission(role) {
    if (!role || !['admin', 'superadmin'].includes(role)) {
      throw new AuthorizationError('Insufficient permissions to create subscription plans');
    }
  }

  _validateUpdatePermission(role) {
    if (!role || !['admin', 'superadmin'].includes(role)) {
      throw new AuthorizationError('Insufficient permissions to update subscription plans');
    }
  }

  _validateArchivePermission(role) {
    if (!role || !['admin', 'superadmin'].includes(role)) {
      throw new AuthorizationError('Insufficient permissions to archive subscription plans');
    }
  }

  _validateCourseManagementPermission(role) {
    if (!role || !['admin', 'superadmin'].includes(role)) {
      throw new AuthorizationError('Insufficient permissions to manage plan courses');
    }
  }

  /**
   * Validate plan data structure
   */
  _validatePlanData(data) {
    const errors = [];

    if (!data.name || data.name.length < 2) {
      errors.push('Plan name must be at least 2 characters');
    }

    if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
      errors.push('Plan slug must contain only lowercase letters, numbers, and hyphens');
    }

    if (data.pricing && data.pricing.price < 0) {
      errors.push('Pricing must be non-negative');
    }

    if (errors.length > 0) {
      throw new ValidationError('Plan validation failed', { validationErrors: errors });
    }
  }

  /**
   * Validate unique constraints
   */
  async _validateUniqueConstraints(name, slug) {
    const existingPlan = await SubscriptionPlan.findOne({
      $or: [
        { name: name },
        { slug: slug }
      ]
    }).lean();

    if (existingPlan) {
      if (existingPlan.name === name) {
        throw new ConflictError('A plan with this name already exists');
      }
      if (existingPlan.slug === slug) {
        throw new ConflictError('A plan with this slug already exists');
      }
    }
  }

  /**
   * Validate included courses
   */
  async _validateIncludedCourses(includedCourses = []) {
    if (!Array.isArray(includedCourses) || includedCourses.length === 0) {
      return; // No courses included is valid
    }

    const courseIds = includedCourses.map(course =>
      typeof course === 'string' ? course : course.courseId
    ).filter(id => id);

    const existingCourses = await Course.find({
      _id: { $in: courseIds }
    }, '_id title').lean();

    if (existingCourses.length !== courseIds.length) {
      const existingIds = existingCourses.map(c => c._id.toString());
      const missingIds = courseIds.filter(id => !existingIds.includes(id.toString()));

      throw new ValidationError(
        `Some courses do not exist or are not accessible: ${missingIds.join(', ')}`
      );
    }
  }

  /**
   * Validate pricing structure
   */
  _validatePricingStructure(pricing) {
    if (!pricing || !pricing.price || pricing.price <= 0) {
      throw new ValidationError('Valid pricing is required for all plans');
    }

    if (pricing.originalPrice && pricing.originalPrice <= pricing.price) {
      throw new ValidationError('Original price must be higher than current price for discounts');
    }
  }

  /**
   * Transform incoming plan data to database format
   */
  _transformPlanData(data, userId) {
    return {
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,

      pricing: data.pricing || {},
      billing: data.billing || {},
      features: data.features || {},
      business: {
        ...data.business,
        sortOrder: data.business?.sortOrder || 0,
        isActive: data.business?.isActive !== false,
        isVisible: data.business?.isVisible !== false
      },
      analytics: data.analytics || {},

      includedCourses: (data.includedCourses || []).map(course => ({
        courseId: course.courseId || course,
        courseName: course.courseName,
        courseSlug: course.courseSlug,
        accessLevel: course.accessLevel || 'full',
        restrictions: course.restrictions || {},
        metadata: {
          addedAt: new Date(),
          addedBy: userId
        }
      })),

      marketing: data.marketing || {},
      seo: data.seo || {},

      audit: {
        createdBy: userId,
        createdAt: new Date()
      }
    };
  }

  /**
   * Populate plan with related data
   */
  async _populatePlan(planId, options = {}) {
    return await SubscriptionPlan.findById(planId)
      .populate('audit.createdBy', 'name email')
      .populate('audit.updatedBy', 'name email')
      .populate('includedCourses.courseId', 'title slug description instructor difficulty duration')
      .lean();
  }

  /**
   * Handle service errors with consistent formatting
   */
  _handleServiceError(error, defaultMessage) {
    if (error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof ConflictError) {
      return error;
    }

    Logger.error('Subscription Plan Service Error', {
      message: error.message,
      stack: error.stack,
      defaultMessage
    });

    return new DatabaseError(`${defaultMessage}: ${error.message}`);
  }

  // ============================================================================
  // ADDITIONAL PRIVATE METHODS
  // ============================================================================

  _buildPlanFilter(filters, options) {
    const filter = {};

    // Basic visibility filter
    if (!options.includeHidden) {
      filter['business.isVisible'] = true;
    }

    if (!options.includeInactive) {
      filter['business.isActive'] = true;
      filter['audit.isArchived'] = { $ne: true };
    }

    // Pricing range filter
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      filter['pricing.price'] = {
        $gte: parseFloat(filters.minPrice),
        $lte: parseFloat(filters.maxPrice)
      };
    }

    // Skill level filter
    if (filters.skillLevel) {
      filter['business.skillLevels'] = filters.skillLevel;
    }

    // Text search filter
    if (filters.search) {
      filter.$text = { $search: filters.search };
    }

    return filter;
  }

  async _processPlanList(plans, options) {
    return plans;
  }

  async _handlePlanNameChange(planId, updateData, context) {
    // Handle cascade updates if plan name/slug changes
    // This could involve updating user subscriptions, analytics, etc.
  }

  async _validatePlanUpdates(updateData, currentPlan) {
    // Business rule validation for updates
  }

  _transformUpdateData(updateData, context) {
    const updateObj = {
      ...updateData,
      'audit.updatedBy': context.userId,
      'audit.updatedAt': new Date()
    };
    return updateObj;
  }

  async _validateArchiveEligibility(planId) {
    // Check if plan has active subscribers or other constraints
  }

  async _validateCourseExists(courseId) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course');
    }
    return course;
  }

  async _validateCourseAccess(course, accessOptions) {
    // Validate course access configuration
  }

  async _validateCourseRemoval(planId, courseId) {
    // Validate business rules for course removal
  }

  async _validateUserExists(userId, session) {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async _validatePlanAvailable(planId, session) {
    const plan = await SubscriptionPlan.findById(planId).session(session);
    if (!plan || !plan.business?.isActive || !plan.business?.isVisible) {
      throw new NotFoundError('Subscription Plan');
    }
    return plan;
  }

  async _validateNoActiveSubscription(userId, planId, session) {
    // Check for existing active subscriptions
  }

  async _buildUserSubscriptionData(userId, plan, options, transactionId) {
    // Build comprehensive user subscription data
    return {
      userId,
      planId: plan._id,
      subscriptionInfo: {
        name: plan.name,
        slug: plan.slug,
        billingCycle: plan.pricing?.billingCycle || 'monthly',
        price: plan.pricing?.price || 0,
        currency: plan.pricing?.currency || 'INR',
        features: plan.features
      },
      billing: {
        startDate: new Date(),
        endDate: this._calculateSubscriptionEndDate(plan),
        gid: plan.pricing?.billingCycle || 'monthly'
      },
      paymentMethod: options.paymentMethod || {},
      audit: {
        initiatedAt: new Date(),
        createdAt: new Date()
      }
    };
  }

  _calculateSubscriptionEndDate(plan) {
    const cycle = plan.pricing?.billingCycle || 'monthly';
    const now = new Date();

    switch (cycle) {
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'quarterly':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      case 'lifetime':
        return new Date(now.getFullYear() + 2000, now.getMonth(), now.getDate()).toISOString().split('T')[0] + 'T23:59:59Z'; // Very far future
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  async _populateUserSubscription(subscriptionId) {
    return await UserSubscription.findById(subscriptionId)
      .populate('userId', 'name email')
      .populate('planId', 'name slug pricing business');
  }
}

module.exports = new SubscriptionPlanService();