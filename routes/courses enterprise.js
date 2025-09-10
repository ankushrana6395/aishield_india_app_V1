/**
 * Courses API Routes - Enterprise Edition
 *
 * Demonstrating Enterprise-Level API Architecture:
 * - Controller Pattern with thin handlers
 * - Service Layer delegation
 * - Repository Layer data access
 * - Enterprise validation and sanitization
 * - Comprehensive error handling
 * - Request/response middleware
 * - Performance monitoring
 * - Security headers and rate limiting
 */

const express = require('express');
const router = express.Router();

// Enterprise-level imports
const courseService = require('../services/courseService');
const BaseRepository = require('../repositories/baseRepository');
const Course = require('../models/Course');
const Logger = require('../utils/logger');
const { asyncHandler, ValidationError, NotFoundError } = require('../utils/errorHandler');
const config = require('../config/environment');

// Middleware imports
const auth = require('../middleware/auth');
const subscription = require('../middleware/subscription');

// Create course repository
const courseRepository = new BaseRepository(Course);

// Request validation classes
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Request validation failed', errors.array());
    }
    next();
  };
};

/**
 * PERFORMANCE MONITORING MIDDLEWARE
 */
const performanceMiddleware = (operation) => (req, res, next) => {
  const startTime = Date.now();
  const logData = {
    operation,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  };

  // Log request start
  Logger.info(`${operation} request started`, logData);

  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode || 200;

    const responseLogData = {
      ...logData,
      duration: `${duration}ms`,
      statusCode,
      success: statusCode < 400
    };

    if (duration > 1000) {
      Logger.performance('Slow API Response Detected', responseLogData);
    } else {
      Logger.info(`${operation} request completed`, responseLogData);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * REQUEST LOGGING MIDDLEWARE
 */
const auditMiddleware = (action) => (req, res, next) => {
  const auditData = {
    action,
    userId: req.user?._id,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  if (req.user) {
    Logger.info(`Audit: ${action}`, auditData);
  }

  next();
};

// Apply authentication to all routes
router.use(auth);

/**
 * GET / - Get courses with enterprise filtering and pagination
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search term
 * - difficulty: Course difficulty filter
 * - featured: Featured courses only (true/false)
 * - published: Published status (true/false)
 * - sortBy: Sort field (createdAt, title, enrollments, featured)
 * - sortOrder: Sort order (asc, desc)
 */
router.get('/',
  performanceMiddleware('GET_COURSES'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('difficulty').optional().isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  query('featured').optional().isBoolean().toBoolean(),
  query('published').optional().isBoolean().toBoolean(),
  query('sortBy').optional().isIn(['createdAt', 'title', 'enrollments', 'difficulty', 'featured']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('search').optional().trim().isLength({ min: 1, max: 100 }),
  validateRequest([]),
  asyncHandler(async (req, res) => {
    const { user } = req;
    const {
      page = 1,
      limit = config.DEFAULT_PAGE_SIZE,
      search,
      difficulty,
      featured,
      published,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filters
    const filters = {
      search: search,
      difficulty: difficulty,
      featured: featured,
      published: published,
      sort: `${sortBy}_${sortOrder}`
    };

    // Get courses using service layer
    const result = await courseService.getCourses(filters, { page, limit }, user);

    // Send standardized response
    res.json({
      success: true,
      data: result,
      message: `${result.courses.length} courses retrieved successfully`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  })
);

/**
 * GET /:slug - Get single course by slug
 *
 * Path Parameters:
 * - slug: Course slug
 *
 * Query Parameters:
 * - includeProgress: Include user progress data (true/false)
 */
router.get('/:slug',
  performanceMiddleware('GET_COURSE_BY_SLUG'),
  param('slug').matches(/^[a-z0-9-]+$/).withMessage('Invalid course slug format'),
  query('includeProgress').optional().isBoolean().toBoolean(),
  validateRequest([]),
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { includeProgress } = req.query;
    const { user } = req;

    Logger.debug('Fetching course by slug', { slug, includeProgress, userId: user?._id });

    // Get course using repository layer
    const course = await courseRepository.findOne(
      { slug, published: true },
      {
        populate: [
          {
            path: 'categories.lectures.contentId',
            select: 'filename title description createdAt'
          },
          {
            path: 'createdBy',
            select: 'name email'
          }
        ],
        fields: includeProgress && user ? '+learningProgress' : undefined
      }
    );

    if (!course) {
      throw new NotFoundError('Course');
    }

    // Apply subscription check for access control
    const accessResult = await subscription.checkAccess(course._id, user);
    course.access = accessResult;

    // Add related courses for recommendations
    const relatedCourses = await courseService.getRelatedCourses(course._id, 3);

    const response = {
      success: true,
      data: {
        course,
        related: relatedCourses,
        access: course.access
      },
      message: 'Course retrieved successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    };

    res.json(response);
  })
);

/**
 * POST /enroll/:courseId - Enroll user in course
 *
 * Path Parameters:
 * - courseId: MongoDB ObjectId
 */
router.post('/:courseId/enroll',
  performanceMiddleware('ENROLL_COURSE'),
  param('courseId').isMongoId().withMessage('Invalid course ID format'),
  validateRequest([]),
  subscription, // Check subscription access
  auditMiddleware('COURSE_ENROLLMENT'),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { user } = req;

    Logger.info('Processing course enrollment', {
      courseId,
      userId: user._id,
      email: user.email
    });

    // Enroll user using service layer
    const enrollment = await courseService.enrollUser(courseId, user._id);

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  })
);

/**
 * PUT /:courseId/progress - Update course progress
 *
 * Path Parameters:
 * - courseId: MongoDB ObjectId
 *
 * Body Parameters:
 * - progress: Progress percentage (0-100)
 * - categoryProgress: Category-specific progress
 * - lastAccessedLecture: Last accessed lecture ID
 */
router.put('/:courseId/progress',
  performanceMiddleware('UPDATE_PROGRESS'),
  param('courseId').isMongoId().withMessage('Invalid course ID format'),
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
  body('categoryProgress').optional().isArray(),
  body('lastAccessedLecture').optional().isString(),
  validateRequest([]),
  auditMiddleware('PROGRESS_UPDATE'),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { progress, categoryProgress, lastAccessedLecture } = req.body;
    const { user } = req;

    Logger.debug('Updating course progress', {
      courseId,
      userId: user._id,
      progress,
      hasCategoryProgress: !!categoryProgress
    });

    // Update progress using service layer
    const updatedProgress = await courseService.updateProgress(courseId, user._id, {
      progress,
      categoryProgress,
      lastAccessedLecture
    });

    res.json({
      success: true,
      data: updatedProgress,
      message: 'Progress updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  })
);

/**
 * GET /user/enrolled - Get user's enrolled courses
 */
router.get('/user/enrolled',
  performanceMiddleware('GET_ENROLLED_COURSES'),
  asyncHandler(async (req, res) => {
    const { user } = req;

    Logger.debug('Fetching enrolled courses', { userId: user._id });

    // Get enrolled courses using service layer
    const enrolledCourses = await courseService.getEnrolledCourses(user._id);

    res.json({
      success: true,
      data: enrolledCourses,
      message: `${enrolledCourses.length} enrolled courses retrieved`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  })
);

// =================================ADMIN ROUTES=================================

/**
 * GET /admin/courses - Admin: Get all courses (paginated)
 */
router.get('/admin/courses',
  performanceMiddleware('ADMIN_GET_COURSES'),
  validateRequest([]),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    const { page, limit, search, status, sortBy, sortOrder } = req.query;

    const filters = {
      search,
      status,
      sort: `${sortBy || 'createdAt'}_${sortOrder || 'desc'}`
    };

    const pagination = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

    const result = await courseService.getCourses(filters, pagination, req.user);

    res.json({
      success: true,
      data: result,
      message: 'Admin courses retrieved successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        admin: true
      }
    });
  })
);

/**
 * POST /admin/courses - Admin: Create new course
 */
router.post('/admin/courses',
  performanceMiddleware('ADMIN_CREATE_COURSE'),
  auditMiddleware('COURSE_CREATION'),
  // Course validation rules
  body('title').isLength({ min: 3, max: 200 }).trim().withMessage('Title must be 3-200 characters'),
  body('slug').matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description').isLength({ min: 10, max: 5000 }).trim().withMessage('Description must be 10-5000 characters'),
  body('difficulty').isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']).withMessage('Invalid difficulty'),
  body('instructor').optional().isLength({ min: 1, max: 100 }).trim().withMessage('Invalid instructor name'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
  validateRequest([]),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    Logger.info('Admin creating course', {
      title: req.body.title,
      difficulty: req.body.difficulty,
      adminId: req.user._id
    });

    const course = await courseService.createCourse(req.body, req.user._id);

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        adminAction: 'create'
      }
    });
  })
);

/**
 * GET /admin/courses/:courseId - Admin: Get course for editing
 */
router.get('/admin/courses/:courseId',
  performanceMiddleware('ADMIN_GET_COURSE'),
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  validateRequest([]),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    const course = await courseService.getCourseById(req.params.courseId, req.user);

    res.json({
      success: true,
      data: course,
      message: 'Course retrieved successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        adminAction: 'get'
      }
    });
  })
);

/**
 * PUT /admin/courses/:courseId - Admin: Update course
 */
router.put('/admin/courses/:courseId',
  performanceMiddleware('ADMIN_UPDATE_COURSE'),
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  body('title').optional().isLength({ min: 3, max: 200 }).trim(),
  body('slug').optional().matches(/^[a-z0-9-]+$/),
  body('description').optional().isLength({ min: 10, max: 5000 }).trim(),
  body('published').optional().isBoolean(),
  validateRequest([]),
  auditMiddleware('COURSE_UPDATE'),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    Logger.info('Admin updating course', {
      courseId: req.params.courseId,
      updates: Object.keys(req.body),
      adminId: req.user._id
    });

    const course = await courseService.updateCourse(req.params.courseId, req.body, req.user._id);

    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        adminAction: 'update'
      }
    });
  })
);

/**
 * DELETE /admin/courses/:courseId - Admin: Delete course (archive)
 */
router.delete('/admin/courses/:courseId',
  performanceMiddleware('ADMIN_DELETE_COURSE'),
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  validateRequest([]),
  auditMiddleware('COURSE_DELETION'),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    Logger.warn('Admin deleting course', {
      courseId: req.params.courseId,
      adminId: req.user._id
    });

    const success = await courseService.deleteCourse(req.params.courseId, req.user._id);

    res.json({
      success,
      message: 'Course archived successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        adminAction: 'delete'
      }
    });
  })
);

/**
 * PATCH /admin/courses/:courseId/publish - Admin: Publish/unpublish course
 */
router.patch('/admin/courses/:courseId/publish',
  performanceMiddleware('ADMIN_PUBLISH_COURSE'),
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  body('published').isBoolean().withMessage('Published must be boolean'),
  validateRequest([]),
  auditMiddleware('COURSE_PUBLISH'),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    const { courseId } = req.params;
    const { published } = req.body;

    Logger.info('Admin toggling course publish status', {
      courseId,
      published,
      adminId: req.user._id
    });

    const course = await courseService.togglePublishStatus(courseId, published, req.user._id);

    res.json({
      success: true,
      data: course,
      message: `Course ${published ? 'published' : 'unpublished'} successfully`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        adminAction: 'publish_toggle'
      }
    });
  })
);

/**
 * GET /admin/analytics - Admin: Get course analytics
 */
router.get('/admin/analytics',
  performanceMiddleware('ADMIN_GET_ANALYTICS'),
  validateRequest([]),
  asyncHandler(async (req, res) => {
    // Only admins can access
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }

    Logger.debug('Admin requesting course analytics', { adminId: req.user._id });

    const analytics = await courseService.getCourseAnalytics();

    res.json({
      success: true,
      data: analytics,
      message: 'Course analytics retrieved successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        adminAction: 'analytics'
      }
    });
  })
);

module.exports = router;