/**
 * Course Service Layer - Enterprise Business Logic
 *
 * This service implements the Service Layer Pattern for course management,
 * encapsulating business logic, validation, and data operations.
 */

const Course = require('../models/Course');
const User = require('../models/User');
const FileCategory = require('../models/FileCategory');
const Category = require('../models/Category');
const Logger = require('../utils/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errorHandler');

/**
 * Course Service Class
 */
class CourseService {

  /**
   * Create a new course with fully validated data
   * @param {Object} courseData - Course creation data
   * @param {String} createdBy - User ID of creator
   * @returns {Object} Created course
   */
  async createCourse(courseData, createdBy) {
    const startTime = Date.now();

    try {
      Logger.info('Creating new course', {
        title: courseData.title,
        createdBy,
        timestamp: new Date().toISOString()
      });

      // Check for duplicate slug
      const existingCourse = await Course.findOne({ slug: courseData.slug });
      if (existingCourse) {
        throw new ConflictError(`Course with slug "${courseData.slug}" already exists`);
      }

      // Validate instructor exists or use default
      if (courseData.instructor && !await User.exists({ name: courseData.instructor })) {
        throw new ValidationError(`Instructor "${courseData.instructor}" does not exist`);
      }

      // Process and validate categories
      if (courseData.categories && courseData.categories.length > 0) {
        await this._validateCategories(courseData.categories);
      }

      // Create course object with proper defaults
      const courseObject = {
        ...courseData,
        createdBy,
        updatedBy: createdBy,
        status: 'draft',
        published: courseData.published || false,
        difficulty: courseData.difficulty || 'Beginner',
        duration: courseData.duration || 0,
        price: courseData.price || 0,
        isFree: !courseData.price || courseData.price <= 0
      };

      const course = new Course(courseObject);
      const savedCourse = await course.save();

      // Log successful creation
      Logger.businessLogger('create', 'course', savedCourse._id, {
        title: savedCourse.title,
        published: savedCourse.published,
        createdBy
      });

      Logger.performanceLogger('createCourse', startTime, 500);
      return savedCourse;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'createCourse',
        courseData: { title: courseData.title, slug: courseData.slug },
        createdBy
      });
      throw error;
    }
  }

  /**
   * Get course by ID with access validation
   * @param {String} courseId - Course ID
   * @param {Object} user - User context (optional)
   * @returns {Object} Course data
   */
  async getCourseById(courseId, user = null) {
    const startTime = Date.now();

    try {
      const course = await Course.findById(courseId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('categories.lectures.contentId');

      if (!course) {
        throw new NotFoundError('Course');
      }

      // Calculate enrollment status and access for user
      const courseData = course.toObject();
      courseData.stats = await this._calculateCourseStats(courseId);
      courseData.access = await this._determineAccessLevel(courseId, user);

      Logger.performanceLogger('getCourseById', startTime, 200);
      return courseData;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getCourseById',
        courseId,
        userId: user?._id
      });
      throw error;
    }
  }

  /**
   * Get courses with enterprise filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination settings
   * @param {Object} user - User context
   * @returns {Object} Paginated course results
   */
  async getCourses(filters = {}, pagination = {}, user = null) {
    const startTime = Date.now();

    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      // Build query with enterprise filtering
      const query = this._buildCourseQuery(filters, user);

      // Execute query with aggregations for efficiency
      const [courses, totalCount] = await Promise.all([
        Course.find(query)
          .select(this._buildCourseProjection())
          .populate('createdBy', 'name')
          .populate('categories', 'name estimatedDuration')
          .populate({
            path: 'categories.lectures.contentId',
            select: 'filename title'
          })
          .sort(this._buildSortCriteria(filters.sort))
          .skip(skip)
          .limit(limit)
          .lean(),
        Course.countDocuments(query)
      ]);

      // Add user-specific data
      const enrichedCourses = await this._enrichCoursesWithUserData(courses, user);

      const result = {
        courses: enrichedCourses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        },
        filters: filters,
        timestamp: new Date().toISOString()
      };

      Logger.performanceLogger('getCourses', startTime, 500);
      return result;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getCourses',
        filters,
        pagination,
        userId: user?._id
      });
      throw error;
    }
  }

  /**
   * Update course with enterprise validation
   * @param {String} courseId - Course ID
   * @param {Object} updateData - Updated course data
   * @param {String} updatedBy - User ID making the change
   * @returns {Object} Updated course
   */
  async updateCourse(courseId, updateData, updatedBy) {
    const startTime = Date.now();

    try {
      Logger.info('Updating course', { courseId, updatedBy });

      const course = await Course.findById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      // Validate slug uniqueness if being updated
      if (updateData.slug && updateData.slug !== course.slug) {
        const existingCourse = await Course.findOne({
          slug: updateData.slug,
          _id: { $ne: courseId }
        });
        if (existingCourse) {
          throw new ConflictError(`Course with slug "${updateData.slug}" already exists`);
        }
      }

      // Update audit fields
      updateData.updatedBy = updatedBy;
      updateData.updatedAt = new Date();

      // Handle publish/unpublish logic
      if (updateData.published && !course.published) {
        updateData.publishDate = new Date();
        updateData.status = 'published';
      } else if (updateData.published === false && course.published) {
        // Archive the course
        await Course.findByIdAndUpdate(courseId, {
          published: false,
          status: 'archived',
          updatedBy,
          updatedAt: new Date()
        });

        Logger.businessLogger('archive', 'course', courseId, { updatedBy });
        throw new ValidationError('Course archived. Cannot update archived courses.');
      }

      // Update course
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        updateData,
        { new: true, runValidators: true }
      );

      Logger.businessLogger('update', 'course', courseId, {
        changes: Object.keys(updateData),
        updatedBy
      });

      Logger.performanceLogger('updateCourse', startTime, 300);
      return updatedCourse;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'updateCourse',
        courseId,
        updateData: Object.keys(updateData),
        updatedBy
      });
      throw error;
    }
  }

  /**
   * Delete course with business logic validation
   * @param {String} courseId - Course ID
   * @param {String} deletedBy - User ID making the deletion
   * @returns {Boolean} Success status
   */
  async deleteCourse(courseId, deletedBy) {
    const startTime = Date.now();

    try {
      Logger.info('Deleting course', { courseId, deletedBy });

      const course = await Course.findById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      // Check business rules before deletion
      const canDelete = await this._canDeleteCourse(courseId);
      if (!canDelete.allowed) {
        throw new ValidationError(canDelete.reason);
      }

      // Soft delete by archiving
      await Course.findByIdAndUpdate(courseId, {
        status: 'archived',
        published: false,
        updatedBy: deletedBy,
        updatedAt: new Date()
      });

      Logger.businessLogger('delete', 'course', courseId, { deletedBy });
      Logger.performanceLogger('deleteCourse', startTime, 300);

      return true;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'deleteCourse',
        courseId,
        deletedBy
      });
      throw error;
    }
  }

  /**
   * Publish or unpublish course
   * @param {String} courseId - Course ID
   * @param {Boolean} published - Publish status
   * @param {String} actionBy - User ID making the change
   * @returns {Object} Updated course
   */
  async togglePublishStatus(courseId, published, actionBy) {
    const startTime = Date.now();

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      // Validate publish requirements
      if (published && !this._canPublishCourse(course)) {
        throw new ValidationError('Course must have title, description, instructor, and at least one category to be published');
      }

      const updateData = {
        published,
        publishDate: published ? new Date() : null,
        status: published ? 'published' : 'draft',
        updatedBy: actionBy,
        updatedAt: new Date()
      };

      const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, { new: true });

      Logger.businessLogger(published ? 'publish' : 'unpublish', 'course', courseId, { actionBy });
      Logger.performanceLogger('togglePublishStatus', startTime, 200);

      return updatedCourse;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'togglePublishStatus',
        courseId,
        published,
        actionBy
      });
      throw error;
    }
  }

  /**
   * Get course analytics and reporting data
   * @param {String} courseId - Course ID
   * @returns {Object} Analytics data
   */
  async getCourseAnalytics(courseId) {
    const startTime = Date.now();

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      const analytics = await this._aggregateCourseAnalytics(courseId);

      Logger.performanceLogger('getCourseAnalytics', startTime, 1000);
      return analytics;

    } catch (error) {
      Logger.errorLogger(error, {
        operation: 'getCourseAnalytics',
        courseId
      });
      throw error;
    }
  }

  // Private helper methods

  async _validateCategories(categories) {
    // Validate categories exist and are active
    const categoryIds = categories.flatMap(cat =>
      cat.lectures.map(lecture => lecture.categoryId)
    ).filter(Boolean);

    if (categoryIds.length > 0) {
      const existingCategories = await Category.find({ _id: { $in: categoryIds } });
      const existingIds = existingCategories.map(cat => cat._id.toString());
      const invalidCategories = categoryIds.filter(id => !existingIds.includes(id.toString()));

      if (invalidCategories.length > 0) {
        throw new ValidationError(`Invalid category IDs: ${invalidCategories.join(', ')}`);
      }
    }
  }

  _buildCourseQuery(filters, user) {
    const query = {};

    // Status filters
    if (filters.status === 'published') {
      query.published = true;
      query.status = 'published';
    } else if (filters.status === 'draft') {
      query.published = false;
    }

    // Search functionality
    if (filters.search) {
      query.$or = [
        { title: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
        { instructor: new RegExp(filters.search, 'i') },
        { tags: new RegExp(filters.search, 'i') }
      ];
    }

    // Difficulty filter
    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    // Created by filter (for admin)
    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    // Access control for non-admin users
    if (!user?.role || user.role !== 'admin') {
      // Only show published courses for regular users
      query.published = true;
    }

    return query;
  }

  _buildCourseProjection() {
    return 'title slug description shortDescription instructor difficulty duration featured enrollments rating thumbnail price isFree tags learningObjectives prerequisites categories createdBy createdAt updatedAt';
  }

  _buildSortCriteria(sortCriteria = 'createdAt_desc') {
    const sortOptions = {};
    const [field, order] = sortCriteria.split('_');
    sortOptions[field] = order === 'desc' ? -1 : 1;
    return sortOptions;
  }

  async _enrichCoursesWithUserData(courses, user) {
    if (!user) return courses;

    const userObj = await User.findById(user._id).select('enrolledCourses subscription');
    if (!userObj) return courses;

    return courses.map(course => ({
      ...course,
      isEnrolled: userObj.enrolledCourses.some(ec => ec.courseId?.toString() === course._id?.toString()),
      hasAccess: this._checkUserCourseAccess(course._id, userObj)
    }));
  }

  async _calculateCourseStats(courseId) {
    const totalLectures = await FileCategory.countDocuments({ course: courseId });
    const enrollmentCount = await User.countDocuments({
      'enrolledCourses.courseId': courseId,
      'enrolledCourses.completedDate': null
    });

    return {
      totalLectures,
      activeEnrollments: enrollmentCount,
      completionRate: 0 // Would need more complex calculation
    };
  }

  async _determineAccessLevel(courseId, user) {
    if (!user) {
      return { level: 'preview', canEnroll: false };
    }

    if (!user.subscription || user.subscription.status !== 'completed') {
      return { level: 'preview', canEnroll: false };
    }

    const hasCourseAccess = user.subscription.coursesIncluded?.includes(courseId.toString());
    if (!hasCourseAccess) {
      return { level: 'preview', canEnroll: false };
    }

    return { level: 'full', canEnroll: true };
  }

  _checkUserCourseAccess(courseId, userObj) {
    if (!userObj.subscription || userObj.subscription.status !== 'completed') {
      return false;
    }

    return userObj.subscription.coursesIncluded?.includes(courseId.toString());
  }

  async _canDeleteCourse(courseId) {
    // Check if course has active enrollments
    const activeEnrollments = await User.countDocuments({
      'enrolledCourses': {
        $elemMatch: {
          courseId: courseId,
          completedDate: { $exists: false }
        }
      }
    });

    if (activeEnrollments > 0) {
      return {
        allowed: false,
        reason: `Cannot delete course with ${activeEnrollments} active enrollments. Please archive the course instead.`
      };
    }

    // Check if used in subscriptions
    const subscriptionPlans = await require('../models/SubscriptionPlan').countDocuments({
      'includedCourses.courseId': courseId,
      published: true
    });

    if (subscriptionPlans > 0) {
      return {
        allowed: false,
        reason: `Course is included in ${subscriptionPlans} active subscription plan(s). Please remove from subscriptions first.`
      };
    }

    return { allowed: true };
  }

  _canPublishCourse(course) {
    return !!(
      course.title &&
      course.description &&
      course.instructor &&
      course.categories &&
      course.categories.length > 0
    );
  }

  async _aggregateCourseAnalytics(courseId) {
    // Complex analytics aggregation would go here
    return {
      courseId,
      totalViews: 0,
      averageCompletionRate: 0,
      enrollmentTrends: [],
      popularContent: [],
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = new CourseService();