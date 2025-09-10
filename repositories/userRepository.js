/**
 * User Repository - Enterprise Data Access Layer
 *
 * Handles all user-related database operations with enterprise patterns
 */

const BaseRepository = require('./baseRepository');
const User = require('../models/User');
const Logger = require('../utils/logger');
const { DatabaseError } = require('../utils/errorHandler');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find user by email with role verification
   * @param {String} email - User email
   * @param {String} role - User role filter (optional)
   * @returns {Object} User document
   */
  async findByEmail(email, role = null) {
    const startTime = Date.now();

    try {
      const criteria = { email: email.toLowerCase() };
      if (role) criteria.role = role;

      const user = await this.model.findOne(criteria).select('+password');

      Logger.databaseLogger('findByEmail', 'User', Date.now() - startTime, !!user);

      if (!user && role) {
        Logger.warn('User not found with specified role', { email, role });
      }

      return user;
    } catch (error) {
      Logger.databaseLogger('findByEmail', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find user by email: ${error.message}`, error);
    }
  }

  /**
   * Find users by role with enterprise pagination
   * @param {String} role - User role (admin, user)
   * @param {Object} options - Query options
   * @returns {Object} Paginated users
   */
  async findByRole(role, options = {}) {
    const startTime = Date.now();

    try {
      const criteria = { role };

      const result = await this.find(criteria, {
        page: options.page || 1,
        limit: Math.min(options.limit || 20, 100),
        sort: options.sort || '-createdAt',
        populate: options.populate,
        fields: options.fields
      });

      Logger.databaseLogger('findByRole', 'User', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('findByRole', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find users by role: ${error.message}`, error);
    }
  }

  /**
   * Find users with active subscriptions
   * @param {Object} subscriptionCriteria - Subscription filter criteria
   * @param {Object} options - Query options
   * @returns {Object} Paginated users with subscriptions
   */
  async findWithActiveSubscriptions(subscriptionCriteria = {}, options = {}) {
    const startTime = Date.now();

    try {
      // Build aggregation pipeline for complex subscription queries
      const pipeline = [
        {
          $match: {
            'subscription.status': 'completed',
            'subscription.endDate': { $gt: new Date() },
            ...subscriptionCriteria
          }
        },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: 'subscription.planName', // This might need adjustment based on your schema
            foreignField: 'name',
            as: 'planDetails'
          }
        }
      ];

      const users = await this.model.aggregate(pipeline);

      Logger.databaseLogger('findWithActiveSubscriptions', 'User', Date.now() - startTime, true);
      return {
        users,
        count: users.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      Logger.databaseLogger('findWithActiveSubscriptions', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find users with active subscriptions: ${error.message}`, error);
    }
  }

  /**
   * Update user subscription data
   * @param {String} userId - User ID
   * @param {Object} subscriptionData - Subscription update data
   * @returns {Object} Updated user
   */
  async updateSubscription(userId, subscriptionData) {
    const startTime = Date.now();

    try {
      const updateData = {
        subscription: subscriptionData,
        updatedAt: new Date()
      };

      // If user becomes subscribed, update isSubscribed flag
      if (subscriptionData.status === 'completed') {
        updateData.isSubscribed = true;
      } else if (subscriptionData.status === 'cancelled' || subscriptionData.status === 'expired') {
        updateData.isSubscribed = false;
      }

      const user = await this.updateById(userId, updateData);

      Logger.businessLogger('subscription_update', 'user', userId, { status: subscriptionData.status });
      Logger.databaseLogger('updateSubscription', 'User', Date.now() - startTime, true);

      return user;

    } catch (error) {
      Logger.databaseLogger('updateSubscription', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to update user subscription: ${error.message}`, error);
    }
  }

  /**
   * Update user's login information
   * @param {String} userId - User ID
   * @param {Object} loginData - Login tracking data
   * @returns {Object} Updated user
   */
  async updateLoginInfo(userId, loginData) {
    const startTime = Date.now();

    try {
      const updateData = {
        lastLogin: new Date(),
        ...loginData,
        updatedAt: new Date()
      };

      const user = await this.updateById(userId, updateData, {
        fields: '-password' // Exclude password from result
      });

      Logger.businessLogger('login_update', 'user', userId, {
        ip: loginData.lastLoginIP,
        userAgent: loginData.lastUserAgent
      });

      Logger.databaseLogger('updateLoginInfo', 'User', Date.now() - startTime, true);
      return user;

    } catch (error) {
      Logger.databaseLogger('updateLoginInfo', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to update user login info: ${error.message}`, error);
    }
  }

  /**
   * Get user enrollment statistics
   * @param {String} userId - User ID
   * @returns {Object} Enrollment statistics
   */
  async getEnrollmentStats(userId) {
    const startTime = Date.now();

    try {
      const user = await this.model.findById(userId)
        .select('enrolledCourses')
        .lean();

      if (!user) {
        throw new Error('User not found');
      }

      const stats = {
        totalEnrollments: user.enrolledCourses.length,
        completedCourses: user.enrolledCourses.filter(ec => ec.completedDate).length,
        inProgressCourses: user.enrolledCourses.filter(ec => !ec.completedDate).length,
        averageProgress: user.enrolledCourses.length > 0 ?
          user.enrolledCourses.reduce((sum, ec) => sum + (ec.progress || 0), 0) / user.enrolledCourses.length : 0
      };

      Logger.databaseLogger('getEnrollmentStats', 'User', Date.now() - startTime, true);
      return stats;

    } catch (error) {
      Logger.databaseLogger('getEnrollmentStats', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get enrollment stats: ${error.message}`, error);
    }
  }

  /**
   * Check if email exists (for registration validation)
   * @param {String} email - Email to check
   * @param {String} excludeUserId - User ID to exclude (optional)
   * @returns {Boolean} Email exists
   */
  async emailExists(email, excludeUserId = null) {
    const startTime = Date.now();

    try {
      const criteria = { email: email.toLowerCase() };
      if (excludeUserId) {
        criteria._id = { $ne: excludeUserId };
      }

      const exists = await this.exists(criteria);

      Logger.databaseLogger('emailExists', 'User', Date.now() - startTime, exists);
      return exists;

    } catch (error) {
      Logger.databaseLogger('emailExists', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to check email existence: ${error.message}`, error);
    }
  }

  /**
   * Get user analytics for admin dashboard
   * @param {Object} dateRange - Date range filter
   * @returns {Object} User analytics
   */
  async getUserAnalytics(dateRange = {}) {
    const startTime = Date.now();

    try {
      const matchStage = {};
      if (dateRange.start) matchStage.createdAt = { $gte: new Date(dateRange.start) };
      if (dateRange.end) matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(dateRange.end) };

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            subscribedCount: {
              $sum: { $cond: [{ $eq: ['$isSubscribed', true] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': -1 } }
      ];

      const analytics = await this.model.aggregate(pipeline);

      Logger.databaseLogger('getUserAnalytics', 'User', Date.now() - startTime, true);
      return {
        dailyStats: analytics,
        totalUsers: analytics.reduce((sum, day) => sum + day.count, 0),
        totalSubscribed: analytics.reduce((sum, day) => sum + day.subscribedCount, 0),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      Logger.databaseLogger('getUserAnalytics', 'User', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get user analytics: ${error.message}`, error);
    }
  }
}

module.exports = new UserRepository();