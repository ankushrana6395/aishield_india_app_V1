/**
 * Subscription Plan Validation Schemas
 *
 * Comprehensive validation schemas for subscription plan operations
 * using Joi-style validation with detailed error messages
 */

// Validation library (you might need to install joi first)
const Joi = require('joi');

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

/**
 * Common validation utilities
 */
const validators = {
  // Object ID validation
  objectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'valid ObjectId'),

  // Slug validation
  slug: Joi.string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, and hyphens only')
    .messages({
      'string.pattern.name': 'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Slug must be at least 2 characters long',
      'string.max': 'Slug cannot exceed 100 characters'
    }),

  // Price validation
  currency: Joi.string()
    .valid('INR', 'USD', 'EUR', 'GBP', 'CAD')
    .default('INR'),

  // URL validation
  url: Joi.string().uri({
    scheme: ['http', 'https'],
    allowRelative: false
  })
};

// ============================================================================
// PRICING SCHEMA
// ============================================================================

const pricingSchema = Joi.object({
  currency: validators.currency,
  price: Joi.number().min(0).precision(2).required()
    .messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Price is required'
    }),
  originalPrice: Joi.number().min(Joi.ref('price')).precision(2).allow(null)
    .messages({
      'number.min': 'Original price must be higher than current price'
    }),
  discountPercentage: Joi.number().min(0).max(100).precision(2)
    .when('originalPrice', {
      is: Joi.number().min(0),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
  setupFee: Joi.number().min(0).precision(2).default(0),
  billingCycle: Joi.string()
    .valid('monthly', 'quarterly', 'yearly', 'lifetime')
    .default('monthly')
    .required(),
  trialPeriod: Joi.number().integer().min(0).max(365).default(0)
    .when('billingCycle', {
      is: 'lifetime',
      then: Joi.forbid()
    }),
  gracePeriod: Joi.number().integer().min(0).max(30).default(7)
}).messages({
  'object.unknown': 'Unknown pricing field: "{#key}"'
});

// ============================================================================
// BUSINESS RULES SCHEMA
// ============================================================================

const businessSchema = Joi.object({
  isActive: Joi.boolean().default(true),
  isVisible: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),
  isRecommended: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).max(999).default(0),
  targetAudience: Joi.array().items(
    Joi.string().valid('students', 'professionals', 'managers', 'enterprise', 'individuals')
  ),
  targetOccupations: Joi.array().items(
    Joi.string().trim().max(100)
  ),
  skillLevels: Joi.array().items(
    Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'Expert', 'All')
  ),
  industries: Joi.array().items(
    Joi.string().trim().max(100)
  ),
  targetOccupation: Joi.string().trim().max(100), // Legacy field support
  maxSubscriptions: Joi.number().integer().min(0).allow(null),
  maxEnrollments: Joi.number().integer().min(0).default(0),
  allowedCountries: Joi.array().items(
    Joi.string().length(2).uppercase()
  ),
  blockedCountries: Joi.array().items(
    Joi.string().length(2).uppercase()
  )
});

// ============================================================================
// FEATURE SCHEMA
// ============================================================================

const featuresSchema = Joi.object({
  // Core Features
  unlimitedLectures: Joi.boolean().default(false),
  downloadableContent: Joi.boolean().default(false),
  offlineAccess: Joi.boolean().default(false),
  certificates: Joi.boolean().default(true),

  // Learning Features
  progressTracking: Joi.boolean().default(true),
  customLearningPaths: Joi.boolean().default(false),
  practiceExercises: Joi.boolean().default(false),
  quizzesAssessments: Joi.boolean().default(true),

  // Support Features
  prioritySupport: Joi.boolean().default(false),
  mentoringSessions: Joi.number().integer().min(0).default(0),
  liveWebinars: Joi.number().integer().min(0).default(0),
  communityAccess: Joi.boolean().default(true),

  // Platform Features
  mobileAccess: Joi.boolean().default(true),
  desktopAccess: Joi.boolean().default(true),

  // Professional Features
  resumeBuilding: Joi.boolean().default(false),
  jobPlacement: Joi.boolean().default(false),
  industryCertifications: Joi.boolean().default(false),

  // Advanced Features
  lifetimeAccess: Joi.boolean().default(false),
  flexibleScheduling: Joi.boolean().default(false),
  teamCollaboration: Joi.boolean().default(false),

  // Custom Features (allow additional fields)
  customFeatures: Joi.object().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/, Joi.string().trim())
});

// ============================================================================
// COURSE ACCESS SCHEMA
// ============================================================================

const courseAccessSchema = Joi.object({
  courseId: validators.objectId.required(),
  courseName: Joi.string().trim().max(200).required(),
  courseSlug: Joi.string().lowercase().trim().required(),
  accessLevel: Joi.string().valid('full', 'restricted', 'preview').default('full').required(),
  restrictions: Joi.object({
    maxEnrollments: Joi.number().integer().min(0),
    validDays: Joi.number().integer().min(1),
    allowedCategories: Joi.array().items(Joi.string().trim()),
    disabledFeatures: Joi.array().items(
      Joi.string().valid('download', 'share', 'print', 'mobileaccess', 'offlineaccess')
    )
  }).default({})
});

// ============================================================================
// MARKETING SCHEMA
// ============================================================================

const marketingSchema = Joi.object({
  badgeText: Joi.string().trim().max(20).allow(''),
  badgeColor: Joi.string().regex(/^#[0-9a-f]{6}$/i, 'hex color').default('#1976d2'),
  callToAction: Joi.string().trim().max(30).default('Subscribe Now'),
  highlightColor: Joi.string().regex(/^#[0-9a-f]{6}$/i, 'hex color').default('#1976d2'),
  benefits: Joi.array().items(
    Joi.object({
      icon: Joi.string().trim().max(50),
      title: Joi.string().trim().max(100).required(),
      description: Joi.string().trim().max(200).required()
    })
  ).default([])
});

// ============================================================================
// MAIN PLAN SCHEMAS
// ============================================================================

/**
 * Base plan schema with common fields
 */
const basePlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'Plan name must be at least 2 characters long',
      'string.max': 'Plan name cannot exceed 100 characters',
      'any.required': 'Plan name is required'
    }),

  slug: validators.slug.required(),

  description: Joi.string().trim().min(10).max(1000).required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required'
    }),

  shortDescription: Joi.string().trim().max(200).allow('')
});

// ============================================================================
// SUBSCRIPTION CREATION/UPDATE SCHEMAS
// ============================================================================

/**
 * Complete plan creation schema
 */
const planCreateSchema = basePlanSchema.keys({
  pricing: pricingSchema.required(),
  business: businessSchema.default({}),
  features: featuresSchema.default({}),
  includedCourses: Joi.array().items(courseAccessSchema).default([]),
  marketing: marketingSchema.default({}),
  seo: Joi.object({
    title: Joi.string().trim().max(60).allow(''),
    description: Joi.string().trim().max(160).allow(''),
    keywords: Joi.array().items(Joi.string().trim().max(30)).default([])
  }).default({})
});

/**
 * Plan update schema (all fields optional)
 */
const planUpdateSchema = basePlanSchema.keys({
  name: Joi.string().trim().min(2).max(100),
  slug: validators.slug,
  description: Joi.string().trim().min(10).max(1000),
  shortDescription: Joi.string().trim().max(200),
  pricing: pricingSchema,
  business: businessSchema,
  features: featuresSchema,
  includedCourses: Joi.array().items(courseAccessSchema),
  marketing: marketingSchema,
  seo: Joi.object({
    title: Joi.string().trim().max(60),
    description: Joi.string().trim().max(160),
    keywords: Joi.array().items(Joi.string().trim().max(30))
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// ============================================================================
// SUBSCRIPTION CREATION SCHEMAS
// ============================================================================

/**
 * User subscription creation schema
 */
const subscriptionCreateSchema = Joi.object({
  planId: validators.objectId.required(),
  billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly', 'lifetime').default('monthly'),
  paymentMethod: Joi.object({
    type: Joi.string().valid('card', 'upi', 'netbanking', 'wallet').required(),
    provider: Joi.string().trim(),
    maskedNumber: Joi.string().trim()
  }).default({}),
  couponCode: Joi.string().trim().max(20).allow('')
});

/**
 * Payment creation schema
 */
const paymentCreateSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  currency: validators.currency.required(),
  planId: validators.objectId.required(),
  subscriptionId: validators.objectId,
  billingPeriod: Joi.object({
    start: Joi.date(),
    end: Joi.date().greater(Joi.ref('start')).messages({
      'date.greater': 'End date must be after start date'
    }),
    cycleType: Joi.string().valid('monthly', 'quarterly', 'yearly', 'lifetime').required()
  }).default({}),
  paymentMethod: Joi.object({
    type: Joi.string().valid('credit_card', 'debit_card', 'upi', 'netbanking', 'wallet', 'bank_transfer').required(),
    provider: Joi.string().valid('visa', 'mastercard', 'amex', 'rupay', 'payswift', 'paytm', 'phonepe', 'gpay').required(),
    maskedNumber: Joi.string().trim(),
    bankName: Joi.string().trim(),
    ifscCode: Joi.string().uppercase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'valid IFSC code')
  }).required()
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * List/filter parameters schema
 */
const planListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('all', 'published', 'draft'),
  search: Joi.string().trim().allow(''),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(Joi.ref('minPrice', { default: 0 })).allow(null),
  skillLevel: Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'Expert', 'All'),
  skillLevels: Joi.array().items(
    Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'Expert', 'All')
  ),
  billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly', 'lifetime'),
  sort: Joi.string().valid('relevance', 'price_asc', 'price_desc', 'popular', 'newest', 'name')
});

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

module.exports = {
  // Main schemas
  planCreateSchema,
  planUpdateSchema,
  subscriptionCreateSchema,
  paymentCreateSchema,

  // Sub-schemas for external use
  pricingSchema,
  businessSchema,
  featuresSchema,
  courseAccessSchema,
  marketingSchema,
  basePlanSchema,

  // Query schemas
  planListQuerySchema,

  // Validation utilities
  validators
};