/**
 * User Service Layer - Enterprise Business Logic
 *
 * Handles all user-related business operations with enterprise patterns
 */

const UserRepository = require('../repositories/userRepository');
const Logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError
} = require('../utils/errorHandler');

class UserService {
  constructor() {
    this.repository = UserRepository;
  }

  /**
   * Register a new user with enterprise validation
   * @param {Object} userData - User registration data
   * @returns {Object} Created user (without password)
   */
  async registerUser(userData) {
    const startTime = Date.now();

    try {
      Logger.info('User registration attempt', {
        email: userData.email,
        name: userData.name
      });

      // Validate required fields
      this._validateUserData(userData);

      // Check if email already exists
      const existingUser = await UserRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('Email address already registered');
      }

      // Hash password
      const hashedPassword = await this._hashPassword(userData.password);

      // Prepare user object
      const userObject = {
        name: userData.name.trim(),
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'user',
        isSubscribed: false,
        createdAt: new Date()
      };

      const user = await UserRepository.create(userObject, {
        fields: '-password' // Never return password
      });

      Logger.businessLogger('register', 'user', user._id, {
        email: user.email,
        role: user.role
      });

      Logger.performanceLogger('registerUser', startTime, 1000);
      return user;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'registerUser',
        email: userData.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Authenticate user login with enterprise security
   * @param {String} email - User email
   * @param {String} password - Plain text password
   * @param {Object} deviceInfo - Login device information
   * @returns {Object} Authentication tokens and user data
   */
  async authenticateUser(email, password, deviceInfo = {}) {
    const startTime = Date.now();

    try {
      Logger.info('User authentication attempt', {
        email,
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent
      });

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user by email
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        Logger.security('Login failed - User not found', { email });
        throw new AuthenticationError('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await this._comparePassword(password, user.password);
      if (!isPasswordValid) {
        Logger.security('Login failed - Invalid password', { email });
        throw new AuthenticationError('Invalid email or password');
      }

      // Update login information
      await this._updateLoginTracking(user._id, deviceInfo);

      // Generate tokens
      const tokens = await this._generateTokens(user);

      const response = {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSubscribed: user.isSubscribed,
          subscription: user.subscription,
          lastLogin: user.lastLogin
        },
        tokens,
        timestamp: new Date().toISOString()
      };

      Logger.businessLogger('login', 'user', user._id, {
        success: true,
        ip: deviceInfo.ip
      });

      Logger.performanceLogger('authenticateUser', startTime, 500);
      return response;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'authenticateUser',
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user profile with enterprise data enrichment
   * @param {String} userId - User ID
   * @param {Object} requester - User making the request
   * @returns {Object} Complete user profile
   */
  async getUserProfile(userId, requester = null) {
    const startTime = Date.now();

    try {
      // Check access permissions
      this._checkProfileAccess(userId, requester);

      const user = await UserRepository.findById(userId, {
        fields: '-password', // Never include password
        populate: []
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Enrich with additional data
      const enrichedProfile = await this._enrichUserProfile(user);

      Logger.performanceLogger('getUserProfile', startTime, 200);
      return enrichedProfile;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getUserProfile',
        userId,
        requesterId: requester?._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update user profile with enterprise validation
   * @param {String} userId - User ID
   * @param {Object} updateData - Profile update data
   * @param {Object} requester - User making the request
   * @returns {Object} Updated user profile
   */
  async updateProfile(userId, updateData, requester) {
    const startTime = Date.now();

    try {
      // Check access permissions
      this._checkProfileAccess(userId, requester);

      Logger.info('Profile update attempt', {
        userId,
        updatedFields: Object.keys(updateData),
        requesterId: requester._id
      });

      // Validate update data
      this._validateProfileUpdate(updateData);

      // Handle password update separately
      if (updateData.password) {
        updateData.password = await this._hashPassword(updateData.password);
      }

      // Add audit trail
      updateData.updatedBy = requester._id;
      updateData.updatedAt = new Date();

      const updatedUser = await UserRepository.updateById(userId, updateData, {
        fields: '-password' // Never include password
      });

      Logger.businessLogger('update', 'user', userId, {
        updatedFields: Object.keys(updateData),
        updatedBy: requester._id
      });

      Logger.performanceLogger('updateProfile', startTime, 300);
      return updatedUser;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'updateProfile',
        userId,
        updatedFields: Object.keys(updateData),
        requesterId: requester._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update user subscription with enterprise features
   * @param {String} userId - User ID
   * @param {String} planId - Subscription plan ID
   * @param {Object} subscriptionData - Subscription details
   * @param {Object} adminUser - Admin performing action
   * @returns {Object} Updated user with subscription
   */
  async updateUserSubscription(userId, planId, subscriptionData, adminUser = null) {
    const startTime = Date.now();

    try {
      Logger.info('User subscription update', {
        userId,
        planId,
        actionBy: adminUser?._id
      });

      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Prepare comprehensive subscription data
      const enrichedSubscriptionData = await this._buildSubscriptionData(planId, subscriptionData);

      // Update user subscription
      const updatedUser = await UserRepository.updateSubscription(userId, enrichedSubscriptionData);

      Logger.businessLogger('subscription_updated', 'user', userId, {
        planId,
        oldStatus: user.subscription?.status,
        newStatus: enrichedSubscriptionData.status,
        updatedBy: adminUser?._id
      });

      Logger.performanceLogger('updateUserSubscription', startTime, 500);
      return updatedUser;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'updateUserSubscription',
        userId,
        planId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Revoke user subscription
   * @param {String} userId - User ID
   * @param {Object} adminUser - Admin performing revocation
   * @returns {Object} Updated user
   */
  async revokeSubscription(userId, adminUser) {
    const startTime = Date.now();

    try {
      Logger.warn('Subscription revocation', {
        userId,
        adminId: adminUser._id
      });

      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Build cancellation data
      const cancellationData = {
        status: 'cancelled',
        revokedAt: new Date(),
        revokedBy: adminUser._id,
        endDate: new Date() // Immediate cancellation
      };

      const updatedUser = await UserRepository.updateSubscription(userId, cancellationData);

      // TODO: Remove user from subscription plan subscriber list

      Logger.businessLogger('subscription_revoked', 'user', userId, {
        revokedBy: adminUser._id
      });

      Logger.performanceLogger('revokeSubscription', startTime, 300);
      return updatedUser;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'revokeSubscription',
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all users for admin with enterprise pagination
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination settings
   * @returns {Object} Paginated users
   */
  async getAllUsers(filters = {}, pagination = {}) {
    const startTime = Date.now();

    try {
      // Build enterprise query filters
      const criteria = this._buildUserFilters(filters);

      const result = await UserRepository.find(criteria, {
        page: pagination.page || 1,
        limit: Math.min(pagination.limit || 20, 100),
        sort: pagination.sort || '-createdAt',
        fields: '-password', // Never include passwords
        populate: filters.populate || []
      });

      Logger.performanceLogger('getAllUsers', startTime, 500);
      return result;

    } catch (error) {
      Logger.errorLogger(error, { operation: 'getAllUsers', filters, error: error.message });
      throw error;
    }
  }

  /**
   * Get subscription subscribers with enterprise features
   * @param {Object} filters - Subscription filters
   * @param {Object} pagination - Pagination settings
   * @returns {Object} Paginated subscribers
   */
  async getSubscribers(filters = {}, pagination = {}) {
    const startTime = Date.now();

    try {
      const result = await UserRepository.findWithActiveSubscriptions(
        filters.subscriptionCriteria || {},
        pagination
      );

      Logger.performanceLogger('getSubscribers', startTime, 500);
      return result;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getSubscribers',
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user analytics for admin dashboard
   * @param {Object} filters - Analytics filters
   * @returns {Object} User analytics
   */
  async getUserAnalytics(filters = {}) {
    const startTime = Date.now();

    try {
      const analytics = await UserRepository.getUserAnalytics(filters.dateRange || {});

      Logger.performanceLogger('getUserAnalytics', startTime, 1000);
      return analytics;

    } catch (error) {
      Logger.errorLogger(error, { operation: 'getUserAnalytics', error: error.message });
      throw error;
    }
  }

  // Private helper methods

  _validateUserData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!data.email || !this._isValidEmail(data.email)) {
      errors.push('Valid email address is required');
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (errors.length > 0) {
      throw new ValidationError('User validation failed', errors);
    }
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  _validateProfileUpdate(data) {
    const allowedFields = ['name', 'password', 'profilePicture'];
    const invalidFields = Object.keys(data).filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new ValidationError('Invalid fields for profile update', invalidFields);
    }
  }

  _checkProfileAccess(targetUserId, requester) {
    // Users can access their own profile
    if (requester._id.toString() === targetUserId.toString()) {
      return;
    }

    // Admins can access any profile
    if (requester.role === 'admin') {
      return;
    }

    throw new AuthorizationError('Access denied to user profile');
  }

  async _hashPassword(password) {
    return await bcrypt.hash(password, config.BCRYPT_ROUNDS);
  }

  async _comparePassword(plainText, hashed) {
    return await bcrypt.compare(plainText, hashed);
  }

  async _generateTokens(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour
    };
  }

  async _updateLoginTracking(userId, deviceInfo) {
    const loginData = {
      lastLogin: new Date(),
      lastLoginIP: deviceInfo.ip,
      lastUserAgent: deviceInfo.userAgent,
      loginCount: await this._getLoginCount(userId) + 1
    };

    await UserRepository.updateLoginInfo(userId, loginData);
  }

  async _getLoginCount(userId) {
    try {
      const user = await UserRepository.findById(userId, { fields: 'loginCount' });
      return user.loginCount || 0;
    } catch (error) {
      return 0;
    }
  }

  async _enrichUserProfile(user) {
    // Add enrollment statistics
    const enrollmentStats = await UserRepository.getEnrollmentStats(user._id);

    // Add subscription details
    let subscriptionDetails = null;
    if (user.isSubscribed && user.subscription) {
      subscriptionDetails = await this._getSubscriptionDetails(user.subscription);
    }

    return {
      ...user.toObject(),
      statistics: enrollmentStats,
      subscription: subscriptionDetails,
      profileComplete: this._isProfileComplete(user),
      lastActivity: user.lastLogin || user.createdAt
    };
  }

  async _getSubscriptionDetails(subscription) {
    // TODO: Populate subscription plan details
    return subscription;
  }

  _isProfileComplete(user) {
    // Check if essential profile fields are filled
    const requiredFields = ['name', 'email'];
    return requiredFields.every(field => user[field] && user[field].toString().trim().length > 0);
  }

  async _buildSubscriptionData(planId, subscriptionData) {
    // TODO: Integrate with subscription plan service
    return {
      ...subscriptionData,
      planId,
      startDate: new Date(),
      createdAt: new Date()
    };
  }

  _buildUserFilters(filters) {
    const criteria = {};

    if (filters.role) {
      criteria.role = filters.role;
    }

    if (filters.isSubscribed !== undefined) {
      criteria.isSubscribed = filters.isSubscribed;
    }

    if (filters.registrationDate) {
      const start = new Date(filters.registrationDate.start);
      const end = new Date(filters.registrationDate.end);
      criteria.createdAt = { $gte: start, $lte: end };
    }

    return criteria;
  }
}

module.exports = new UserService();