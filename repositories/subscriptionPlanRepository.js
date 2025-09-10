/**
 * Subscription Plan Repository - Enterprise Data Access Layer
 *
 * Handles all subscription plan database operations with enterprise patterns
 */

const BaseRepository = require('./baseRepository');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Logger = require('../utils/logger');
const { DatabaseError } = require('../utils/errorHandler');

class SubscriptionPlanRepository extends BaseRepository {
  constructor() {
    super(SubscriptionPlan);
  }

  /**
   * Find published plans with course population
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Object} Paginated published plans
   */
  async findPublishedPlans(filters = {}, options = {}) {
    const startTime = Date.now();

    try {
      const criteria = {
        published: true,
        'business.isActive': true,
        ...filters
      };

      const populate = [
        {
          path: 'includedCourses.courseId',
          select: 'title instructor difficulty duration slug description',
          transform: (doc) => {
            if (!doc) return null;
            return {
              _id: doc._id,
              title: doc.title,
              instructor: doc.instructor,
              difficulty: doc.difficulty,
              duration: doc.duration,
              slug: doc.slug,
              description: doc.description
            };
          }
        },
        {
          path: 'createdBy',
          select: 'name email'
        }
      ];

      const result = await this.find(criteria, {
        page: options.page || 1,
        limit: options.limit || 10,
        sort: 'business.sortOrder pricing.price',
        populate,
        ...options
      });

      Logger.databaseLogger('findPublishedPlans', 'SubscriptionPlan', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('findPublishedPlans', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find published plans: ${error.message}`, error);
    }
  }

  /**
   * Find plans by price range
   * @param {Number} minPrice - Minimum price
   * @param {Number} maxPrice - Maximum price
   * @param {Object} options - Query options
   * @returns {Array} Plans in price range
   */
  async findByPriceRange(minPrice = 0, maxPrice = Infinity, options = {}) {
    const startTime = Date.now();

    try {
      const criteria = {
        'pricing.price': { $gte: minPrice, $lte: maxPrice },
        published: true
      };

      const result = await this.find(criteria, {
        sort: 'pricing.price',
        limit: 50,
        ...options
      });

      Logger.databaseLogger('findByPriceRange', 'SubscriptionPlan', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('findByPriceRange', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find plans by price range: ${error.message}`, error);
    }
  }

  /**
   * Find plans containing specific course
   * @param {String} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Array} Plans containing the course
   */
  async findPlansByCourse(courseId, options = {}) {
    const startTime = Date.now();

    try {
      const criteria = {
        'includedCourses.courseId': courseId,
        published: true
      };

      const result = await this.find(criteria, {
        populate: [
          {
            path: 'includedCourses.courseId',
            select: 'title difficulty instructor'
          }
        ],
        ...options
      });

      Logger.databaseLogger('findPlansByCourse', 'SubscriptionPlan', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('findPlansByCourse', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to find plans by course: ${error.message}`, error);
    }
  }

  /**
   * Update plan pricing
   * @param {String} planId - Plan ID
   * @param {Object} pricingData - New pricing data
   * @returns {Object} Updated plan
   */
  async updatePricing(planId, pricingData) {
    const startTime = Date.now();

    try {
      const updateData = {};

      if (pricingData.price !== undefined) {
        updateData['pricing.price'] = pricingData.price;
        updateData['pricing.currency'] = pricingData.currency || 'INR';
      }

      if (pricingData.originalPrice !== undefined) {
        updateData['pricing.originalPrice'] = pricingData.originalPrice;
        updateData['pricing.discountPercentage'] = pricingData.originalPrice > pricingData.price ?
          Math.round(((pricingData.originalPrice - pricingData.price) / pricingData.originalPrice) * 100) : 0;
      }

      updateData.updatedAt = new Date();

      const updatedPlan = await this.updateById(planId, updateData);

      Logger.businessLogger('pricing_update', 'subscriptionPlan', planId, pricingData);
      Logger.databaseLogger('updatePricing', 'SubscriptionPlan', Date.now() - startTime, true);

      return updatedPlan;

    } catch (error) {
      Logger.databaseLogger('updatePricing', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to update plan pricing: ${error.message}`, error);
    }
  }

  /**
   * Add course to plan
   * @param {String} planId - Plan ID
   * @param {String} courseId - Course ID
   * @param {Object} accessOptions - Access configuration
   * @returns {Object} Updated plan
   */
  async addCourseToPlan(planId, courseId, accessOptions = {}) {
    const startTime = Date.now();

    try {
      // Check if course already exists in plan
      const plan = await this.findById(planId);
      const courseExists = plan.includedCourses.some(
        course => course.courseId.toString() === courseId.toString()
      );

      if (courseExists) {
        throw new Error('Course already exists in this plan');
      }

      const newCourseAccess = {
        courseId,
        courseName: '', // Will be populated via validation
        courseSlug: '',
        accessLevel: accessOptions.accessLevel || 'full',
        restrictions: accessOptions.restrictions || {}
      };

      const updateData = {
        $push: { includedCourses: newCourseAccess },
        updatedAt: new Date()
      };

      const updatedPlan = await this.updateById(planId, updateData);

      Logger.businessLogger('course_added', 'subscriptionPlan', planId, {
        courseId,
        accessLevel: accessOptions.accessLevel
      });

      Logger.databaseLogger('addCourseToPlan', 'SubscriptionPlan', Date.now() - startTime, true);
      return updatedPlan;

    } catch (error) {
      Logger.databaseLogger('addCourseToPlan', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to add course to plan: ${error.message}`, error);
    }
  }

  /**
   * Remove course from plan
   * @param {String} planId - Plan ID
   * @param {String} courseId - Course ID
   * @returns {Object} Updated plan
   */
  async removeCourseFromPlan(planId, courseId) {
    const startTime = Date.now();

    try {
      const updateData = {
        $pull: { includedCourses: { courseId } },
        updatedAt: new Date()
      };

      const updatedPlan = await this.updateById(planId, updateData);

      Logger.businessLogger('course_removed', 'subscriptionPlan', planId, { courseId });
      Logger.databaseLogger('removeCourseFromPlan', 'SubscriptionPlan', Date.now() - startTime, true);

      return updatedPlan;

    } catch (error) {
      Logger.databaseLogger('removeCourseFromPlan', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to remove course from plan: ${error.message}`, error);
    }
  }

  /**
   * Update plan statistics (subscriber count, revenue)
   * @param {String} planId - Plan ID
   * @param {Object} stats - Statistics to update
   * @returns {Object} Updated plan
   */
  async updateStatistics(planId, stats) {
    const startTime = Date.now();

    try {
      const updateData = { updatedAt: new Date() };

      if (stats.subscriberCount !== undefined) {
        updateData['analytics.subscriberCount'] = stats.subscriberCount;
      }

      if (stats.totalRevenue !== undefined) {
        updateData['analytics.totalRevenue'] = stats.totalRevenue;
      }

      if (stats.averageRating !== undefined) {
        updateData['analytics.averageRating'] = stats.averageRating;
      }

      const updatedPlan = await this.updateById(planId, updateData);

      if (stats.subscriberCount !== undefined) {
        Logger.businessLogger('stats_update', 'subscriptionPlan', planId, stats);
      }

      Logger.databaseLogger('updateStatistics', 'SubscriptionPlan', Date.now() - startTime, true);
      return updatedPlan;

    } catch (error) {
      Logger.databaseLogger('updateStatistics', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to update plan statistics: ${error.message}`, error);
    }
  }

  /**
   * Get popular plans based on subscriber count
   * @param {Number} limit - Number of plans to return
   * @returns {Array} Popular plans
   */
  async getPopularPlans(limit = 3) {
    const startTime = Date.now();

    try {
      const criteria = {
        published: true,
        'business.isPopular': true,
        'analytics.subscriberCount': { $gt: 0 }
      };

      const result = await this.find(criteria, {
        sort: '-analytics.subscriberCount',
        limit,
        populate: [
          {
            path: 'includedCourses.courseId',
            select: 'title difficulty instructor'
          }
        ]
      });

      Logger.databaseLogger('getPopularPlans', 'SubscriptionPlan', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('getPopularPlans', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get popular plans: ${error.message}`, error);
    }
  }

  /**
   * Bulk update plan status
   * @param {Array} planIds - Array of plan IDs
   * @param {Boolean} status - New status
   * @returns {Object} Bulk update result
   */
  async bulkUpdateStatus(planIds, status) {
    const startTime = Date.now();

    try {
      const operations = planIds.map(planId => ({
        updateOne: {
          filter: { _id: planId },
          update: {
            published: status,
            updatedAt: new Date()
          }
        }
      }));

      const result = await this.bulkWrite(operations);

      Logger.businessLogger('bulk_status_update', 'subscriptionPlan', null, {
        planIds,
        status,
        modifiedCount: result.modifiedCount
      });

      Logger.databaseLogger('bulkUpdateStatus', 'SubscriptionPlan', Date.now() - startTime, true);
      return result;

    } catch (error) {
      Logger.databaseLogger('bulkUpdateStatus', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to bulk update plan status: ${error.message}`, error);
    }
  }

  /**
   * Get plan analytics with detailed metrics
   * @param {String} planId - Plan ID
   * @returns {Object} Plan analytics
   */
  async getPlanAnalytics(planId) {
    const startTime = Date.now();

    try {
      const pipeline = [
        { $match: { _id: planId } },
        {
          $lookup: {
            from: 'users',
            let: { planId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$subscription.planId', '$$planId'] }
                }
              },
              {
                $group: {
                  _id: null,
                  activeSubscribers: {
                    $sum: { $cond: [{ $eq: ['$subscription.status', 'completed'] }, 1, 0] }
                  },
                  totalRevenue: { $sum: '$subscription.price' },
                  averageRevenue: { $avg: '$subscription.price' }
                }
              }
            ],
            as: 'subscriberStats'
          }
        },
        {
          $unwind: {
            path: '$subscriberStats',
            preserveNullAndEmptyArrays: true
          }
        }
      ];

      const analytics = await this.model.aggregate(pipeline);

      Logger.databaseLogger('getPlanAnalytics', 'SubscriptionPlan', Date.now() - startTime, true);
      return analytics[0] || {};

    } catch (error) {
      Logger.databaseLogger('getPlanAnalytics', 'SubscriptionPlan', Date.now() - startTime, false);
      throw new DatabaseError(`Failed to get plan analytics: ${error.message}`, error);
    }
  }
}

module.exports = new SubscriptionPlanRepository();