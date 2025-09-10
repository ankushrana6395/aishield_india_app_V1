/**
 * Enterprise Subscription Plan Professional API Routes
 *
 * REST API endpoints with comprehensive error handling, validation,
 * and enterprise-grade features
 */

// External Dependencies
const express = require('express');

// Internal Services
const SubscriptionPlanService = require('../services/subscriptionPlanService');
const PaymentService = require('../services/paymentService');
const UserSubscriptionService = require('../services/userSubscriptionService');

// Middleware and Security
const auth = require('../middleware/auth');
const {
  asyncHandler,
  rateLimitHandler,
  validateRequest,
  formatValidationErrors
} = require('../utils/errorHandler');

// Validation Schemas (using Joi-like validation)
const {
  planCreateSchema,
  planUpdateSchema,
  subscriptionCreateSchema,
  paymentCreateSchema
} = require('../validators/subscriptionValidators');

const router = express.Router();

// ============================================================================
// SUBSCRIPTION PLAN MANAGEMENT (ADMIN)
// ============================================================================

/**
 * @swagger
 * /api/v1/subscription-plans:
 *   get:
 *     summary: Get paginated list of subscription plans
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *     responses:
 *       200:
 *         description: List of subscription plans retrieved successfully
 */
router.get('/plans', auth, asyncHandler(async (req, res) => {
  const { page, limit, status, search, minPrice, maxPrice, skillLevel, sort } = req.query;

  const result = await SubscriptionPlanService.getPlans({
    page,
    limit,
    status,
    search,
    minPrice,
    maxPrice,
    skillLevel,
    sort
  }, {
    includeHidden: req.query.includeHidden === 'true',
    includeInactive: req.query.includeInactive === 'true'
  });

  res.json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscription-plans:
 *   post:
 *     summary: Create new subscription plan
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - description
 *               - pricing
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               slug:
 *                 type: string
 *                 pattern: '^[a-z0-9-]+$'
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
 */
router.post('/plans', auth, validateRequest(planCreateSchema), asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.createPlan(
    req.body,
    req.user._id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   get:
 *     summary: Get subscription plan by ID
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan retrieved successfully
 */
router.get('/plans/:id', asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.getPlanById(req.params.id, {
    includeHidden: req.query.includeHidden === 'true'
  });

  res.json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   put:
 *     summary: Update subscription plan
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 */
router.put('/plans/:id', auth, validateRequest(planUpdateSchema), asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.updatePlan(
    req.params.id,
    req.body,
    req.user._id,
    req.user.role
  );

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   delete:
 *     summary: Archive subscription plan (soft delete)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/plans/:id', auth, asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.archivePlan(
    req.params.id,
    req.user._id,
    req.user.role
  );

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscription-plans/{id}/courses/{courseId}:
 *   post:
 *     summary: Add course to subscription plan
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 */
router.post('/plans/:id/courses/:courseId', auth, asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.addCourse(
    req.params.id,
    req.params.courseId,
    req.body,
    req.user._id,
    req.user.role
  );

  res.status(201).json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscription-plans/{id}/courses/{courseId}:
 *   delete:
 *     summary: Remove course from subscription plan
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/plans/:id/courses/:courseId', auth, asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.removeCourse(
    req.params.id,
    req.params.courseId,
    req.user._id,
    req.user.role
  );

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// USER SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/my-subscription:
 *   get:
 *     summary: Get current user's subscription details
 *     tags: [User Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *         default: false
 */
router.get('/my-subscription', auth, asyncHandler(async (req, res) => {
  const result = await UserSubscriptionService.getUserSubscription(
    req.user._id,
    {
      includeHistory: req.query.includeHistory === 'true'
    }
  );

  res.json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Create user subscription
 *     tags: [User Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/subscriptions', auth, validateRequest(subscriptionCreateSchema), asyncHandler(async (req, res) => {
  const result = await UserSubscriptionService.createSubscription(
    req.user._id,
    req.body.planId,
    req.body
  );

  res.status(201).json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel user subscription
 *     tags: [User Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/subscriptions/:id/cancel', auth, asyncHandler(async (req, res) => {
  const result = await UserSubscriptionService.cancelSubscription(
    req.user._id,
    req.params.id,
    req.body
  );

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}/pause:
 *   post:
 *     summary: Pause user subscription
 *     tags: [User Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/subscriptions/:id/pause', auth, asyncHandler(async (req, res) => {
  const result = await UserSubscriptionService.pauseSubscription(
    req.user._id,
    req.params.id,
    req.body
  );

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/my-accessible-courses:
 *   get:
 *     summary: Get user's accessible courses
 *     tags: [User Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my-accessible-courses', auth, asyncHandler(async (req, res) => {
  const result = await UserSubscriptionService.getAccessibleCourses(
    req.user._id,
    req.query
  );

  res.json({
    success: true,
    data: result.data,
    summary: result.summary,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/check-course-access/{courseId}:
 *   get:
 *     summary: Check user's access to a course
 *     tags: [User Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/check-course-access/:courseId', auth, asyncHandler(async (req, res) => {
  const result = await UserSubscriptionService.checkCourseAccess(
    req.user._id,
    req.params.courseId
  );

  res.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/payments/order:
 *   post:
 *     summary: Create payment order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/payments/order', auth, validateRequest(paymentCreateSchema), asyncHandler(async (req, res) => {
  const result = await PaymentService.createPaymentOrder(req.body, req.user._id);

  res.status(201).json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/payments/verify:
 *   post:
 *     summary: Verify payment completion
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/payments/verify', auth, asyncHandler(async (req, res) => {
  const result = await PaymentService.verifyPayment(req.body, req.user._id);

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/payments/refund:
 *   post:
 *     summary: Process payment refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/payments/refund', auth, asyncHandler(async (req, res) => {
  const result = await PaymentService.processRefund(
    req.body.paymentId,
    req.body.amount,
    req.body.reason,
    { refundedBy: req.user._id }
  );

  res.json({
    success: true,
    data: result.data,
    message: result.message,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/payments/analytics:
 *   get:
 *     summary: Get payment analytics for admin
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/payments/analytics', auth, asyncHandler(async (req, res) => {
  const result = await PaymentService.getPaymentAnalytics(req.query);

  res.json({
    success: true,
    data: result.data,
    filters: result.filters,
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// ADMIN ANALYTICS AND MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/subscription-analytics:
 *   get:
 *     summary: Get subscription analytics for admin dashboard
 *     tags: [Admin Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/subscription-analytics', auth, asyncHandler(async (req, res) => {
  // Check admin permissions
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Admin privileges required'
      }
    });
  }

  const result = await UserSubscriptionService.getSubscriptionAnalytics(req.query);

  res.json({
    success: true,
    data: result.data,
    filters: result.filters,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/admin/popular-plans:
 *   get:
 *     summary: Get popular subscription plans
 *     tags: [Admin Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/popular-plans', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Admin privileges required'
      }
    });
  }

  const limit = parseInt(req.query.limit) || 5;
  const result = await SubscriptionPlanService.getPopularPlans(limit);

  res.json({
    success: true,
    data: result.data ? result.data : [],
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/admin/plans-analytics:
 *   get:
 *     summary: Get plans performance analytics
 *     tags: [Admin Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/plans-analytics', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Admin privileges required'
      }
    });
  }

  const result = await SubscriptionPlanService.getPlanAnalytics();

  res.json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// PUBLIC ENDPOINTS (NO AUTH REQUIRED)
// ============================================================================

/**
 * @swagger
 * /api/v1/public/plans:
 *   get:
 *     summary: Get published subscription plans for public view
 *     tags: [Public Routes]
 */
router.get('/public/plans', asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.getPlans({
    status: 'published',
    isVisible: true,
    isActive: true
  }, {
    includeHidden: false,
    includeInactive: false
  });

  res.json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/v1/public/plans/{id}:
 *   get:
 *     summary: Get specific published subscription plan for public view
 *     tags: [Public Routes]
 */
router.get('/public/plans/:id', asyncHandler(async (req, res) => {
  const result = await SubscriptionPlanService.getPlanById(req.params.id, {
    includeHidden: false,
    validatePublished: true
  });

  res.json({
    success: true,
    data: result.data,
    timestamp: new Date().toISOString()
  });
}));

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// Global error handling for this router
router.use((error, req, res, next) => {
  console.error('Subscription API Error:', error);

  const statusCode = error.statusCode || 500;
  const errorResponse = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add validation errors if present
  if (error.details) {
    errorResponse.error.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
});

module.exports = router;