/**
 * Enterprise Subscription Plan Model
 *
 * Comprehensive database schema for subscription plan management
 * with advanced validation, business logic, and analytics
 */

// External Dependencies
const mongoose = require('mongoose');

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

/**
 * Course Access Configuration Sub-Schema
 * Defines how individual courses are accessible within a plan
 */
const CourseAccessSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  courseSlug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  accessLevel: {
    type: String,
    enum: ['full', 'restricted', 'preview'],
    default: 'full',
    required: true
  },
  restrictions: {
    maxEnrollments: {
      type: Number,
      min: 0
    },
    validDays: {
      type: Number,
      min: 1
    },
    allowedCategories: [{
      type: String,
      trim: true
    }],
    disabledFeatures: [{
      type: String,
      enum: ['download', 'share', 'print', 'mobileaccess', 'offlineaccess']
    }]
  },
  metadata: {
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sortOrder: { type: Number, default: 0 }
  }
}, { _id: false });

/**
 * Pricing Configuration Sub-Schema
 * Advanced pricing structure supporting multiple currencies and billing cycles
 */
const PricingSchema = new mongoose.Schema({
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD'],
    default: 'INR',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    set: function(val) { return Math.round(val * 100) / 100; } // Round to 2 decimal places
  },
  originalPrice: {
    type: Number,
    min: 0,
    set: function(val) { return val ? Math.round(val * 100) / 100 : undefined; }
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    set: function(val) {
      // Auto-calculate discount percentage if originalPrice and price are available
      if (this.originalPrice && this.price && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
      }
      return val || 0;
    }
  },
  setupFee: {
    type: Number,
    min: 0,
    default: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    default: 'monthly',
    required: true
  },
  trialPeriod: {
    type: Number,
    min: 0,
    max: 365, // Max 365 days trial
    default: 0,
    comment: 'Trial period in days'
  },
  gracePeriod: {
    type: Number,
    min: 0,
    max: 30, // Max 30 days grace period
    default: 7,
    comment: 'Grace period after failed payment in days'
  }
}, { _id: false });

/**
 * Business Rules and Configuration Sub-Schema
 * Defines business logic and targeting criteria for plans
 */
const BusinessSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    comment: 'Controls visibility in public listings'
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true,
    comment: 'Featured/highlighted plan'
  },
  isRecommended: {
    type: Boolean,
    default: false,
    comment: 'Recommended for new users'
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
    max: 999,
    comment: 'Display order in listings'
  },

  // Targeting and Segmentation
  targetAudience: [{
    type: String,
    enum: ['students', 'professionals', 'managers', 'enterprise', 'individuals'],
    trim: true
  }],
  targetOccupations: [{
    type: String,
    trim: true,
    maxlength: 100
  }],
  skillLevels: [{
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'All'],
    trim: true
  }],
  industries: [{
    type: String,
    trim: true,
    maxlength: 100
  }],

  // Business Constraints
  maxSubscriptions: {
    type: Number,
    min: 0,
    comment: 'Maximum number of active subscriptions (0 = unlimited)'
  },
  maxEnrollments: {
    type: Number,
    min: 0,
    comment: 'Maximum course enrollments per user per month'
  },

  // Regional Availability
  allowedCountries: [{
    type: String,
    enum: ['IN', 'US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG'], // ISO 3166-1 alpha-2
    uppercase: true
  }],
  blockedCountries: [{
    type: String,
    enum: ['IN', 'US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG'],
    uppercase: true
  }]

}, { _id: false });

/**
 * Features and Benefits Sub-Schema
 * Comprehensive feature set definitions
 */
const FeaturesSchema = new mongoose.Schema({
  // Content Access
  unlimitedLectures: { type: Boolean, default: false },
  downloadableContent: { type: Boolean, default: false },
  offlineAccess: { type: Boolean, default: false },

  // Learning Features
  certificates: { type: Boolean, default: true },
  progressTracking: { type: Boolean, default: true },
  customLearningPaths: { type: Boolean, default: false },
  practiceExercises: { type: Boolean, default: false },
  quizzesAssessments: { type: Boolean, default: true },

  // Support Features
  prioritySupport: { type: Boolean, default: false },
  mentoringSessions: { type: Number, min: 0, default: 0 },
  communityAccess: { type: Boolean, default: true },
  liveWebinars: { type: Number, min: 0, default: 0 },

  // Platform Access
  mobileAccess: { type: Boolean, default: true },
  desktopAccess: { type: Boolean, default: true },

  // Professional Features
  resumeBuilding: { type: Boolean, default: false },
  jobPlacement: { type: Boolean, default: false },
  industryCertifications: { type: Boolean, default: false },

  // Enterprise Features
  teamProgress: { type: Boolean, default: false },
  customReports: { type: Boolean, default: false },
  apiAccess: { type: Boolean, default: false }

}, { _id: false });

/**
 * Analytics and Metrics Sub-Schema
 * Real-time tracking of plan performance
 */
const AnalyticsSchema = new mongoose.Schema({
  // Subscriber Metrics
  subscriberCount: { type: Number, min: 0, default: 0 },
  activeSubscriptions: { type: Number, min: 0, default: 0 },
  totalSubscriptions: { type: Number, min: 0, default: 0 },

  // Revenue Metrics
  totalRevenue: { type: Number, min: 0, default: 0 },
  monthlyRecurringRevenue: { type: Number, min: 0, default: 0 },
  averageRevenuePerUser: { type: Number, min: 0, default: 0 },

  // Performance Metrics
  conversionRate: { type: Number, min: 0, max: 100, default: 0 },
  retentionRate: { type: Number, min: 0, max: 100, default: 0 },
  churnRate: { type: Number, min: 0, max: 100, default: 0 },

  // Engagement Metrics
  averageCompletionRate: { type: Number, min: 0, max: 100, default: 0 },
  averageEngagementScore: { type: Number, min: 0, max: 1000, default: 0 },

  // Rating and Feedback
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  totalReviews: { type: Number, min: 0, default: 0 }

}, { _id: false });

/**
 * Audit and History Sub-Schema
 * Complete audit trail for compliance and debugging
 */
const AuditSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    min: 1,
    default: 1,
    comment: 'Schema version control'
  },
  isArchived: {
    type: Boolean,
    default: false,
    comment: 'Soft delete flag'
  },
  archivedAt: Date,

  // Change History
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now }
  }]

}, { _id: false });

// ============================================================================
// MAIN SCHEMA
// ============================================================================

/**
 * Subscription Plan Schema
 * Enterprise-grade subscription plan model with comprehensive validation
 */
const SubscriptionPlanSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters'],
    minlength: [2, 'Plan name must be at least 2 characters long']
  },
  slug: {
    type: String,
    required: [true, 'Plan slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [100, 'Plan slug cannot exceed 100 characters'],
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    comment: 'URL-friendly identifier'
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    minlength: [10, 'Description must be at least 10 characters long']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },

  // Financial Configuration
  pricing: {
    type: PricingSchema,
    required: true
  },

  // Course Access Configuration
  includedCourses: {
    type: [CourseAccessSchema],
    default: [],
    validate: {
      validator: function(courses) {
        // Ensure no duplicate course IDs
        const courseIds = courses.map(course => course.courseId.toString());
        return courseIds.length === new Set(courseIds).size;
      },
      message: 'Cannot include the same course multiple times'
    }
  },

  // Business Rules
  business: {
    type: BusinessSchema,
    default: () => ({})
  },

  // Feature Set
  features: {
    type: FeaturesSchema,
    default: () => ({})
  },

  // Analytics and Performance
  analytics: {
    type: AnalyticsSchema,
    default: () => ({})
  },

  // Marketing and Presentation
  marketing: {
    badgeText: {
      type: String,
      trim: true,
      maxlength: [20, 'Badge text cannot exceed 20 characters']
    },
    badgeColor: {
      type: String,
      lowercase: true,
      match: [/^#[0-9a-f]{6}$/, 'Badge color must be a valid hex color'],
      default: '#1976d2'
    },
    callToAction: {
      type: String,
      trim: true,
      maxlength: [30, 'CTA text cannot exceed 30 characters'],
      default: 'Subscribe Now'
    },
    highlightColor: {
      type: String,
      lowercase: true,
      match: [/^#[0-9a-f]{6}$/, 'Highlight color must be a valid hex color'],
      default: '#1976d2'
    },
    benefits: [{
      icon: { type: String, trim: true, maxlength: 50 },
      title: { type: String, trim: true, maxlength: 100 },
      description: { type: String, trim: true, maxlength: 200 },
      _id: false
    }]
  },

  // Third-party Integrations
  integrations: {
    razorpayPlanId: String,
    stripePlanId: String,
    webhookEndpoints: [{
      provider: {
        type: String,
        enum: ['razorpay', 'stripe']
      },
      url: String,
      secret: String,
      events: [String],
      isActive: { type: Boolean, default: true },
      _id: false
    }]
  },

  // SEO and Metadata
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      trim: true,
      maxlength: 160
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 30
    }]
  },

  // Audit Trail (Embedded)
  audit: {
    type: AuditSchema,
    default: () => ({})
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

// Performance indexes
SubscriptionPlanSchema.index({ 'business.isActive': 1, 'business.isVisible': 1 });
SubscriptionPlanSchema.index({ slug: 1 }, { unique: true });
SubscriptionPlanSchema.index({ name: 1 });
SubscriptionPlanSchema.index({ 'pricing.price': 1 });
SubscriptionPlanSchema.index({ 'business.isPopular': 1 });
SubscriptionPlanSchema.index({ 'business.targetAudience': 1 });
SubscriptionPlanSchema.index({ 'business.skillLevels': 1 });
SubscriptionPlanSchema.index({ 'analytics.subscriberCount': -1 });
SubscriptionPlanSchema.index({ 'business.sortOrder': 1 });
SubscriptionPlanSchema.index({ createdAt: -1 });

// Compound indexes for complex queries
SubscriptionPlanSchema.index({
  'business.isActive': 1,
  'business.isPopular': -1,
  'pricing.price': 1
});

SubscriptionPlanSchema.index({
  'audit.isArchived': 1,
  'business.isActive': 1
});

// Text search index
SubscriptionPlanSchema.index({
  name: 'text',
  description: 'text',
  'seo.keywords': 'text'
});

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for formatted price
SubscriptionPlanSchema.virtual('formattedPrice').get(function() {
  const currency = this.pricing.currency;
  const price = this.pricing.price;

  const currencySymbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'CAD'
  };

  return `${currencySymbols[currency] || currency}${price}`;
});

// Virtual for discount amount
SubscriptionPlanSchema.virtual('discountAmount').get(function() {
  if (this.pricing.originalPrice > this.pricing.price) {
    return this.pricing.originalPrice - this.pricing.price;
  }
  return 0;
});

// Virtual for total courses
SubscriptionPlanSchema.virtual('totalCourses').get(function() {
  return this.includedCourses.length;
});

// Virtual for is free plan
SubscriptionPlanSchema.virtual('isFree').get(function() {
  return this.pricing.price === 0;
});

// Virtual for has discount
SubscriptionPlanSchema.virtual('hasDiscount').get(function() {
  return this.pricing.originalPrice && this.pricing.originalPrice > this.pricing.price;
});

// Virtual for access URL
SubscriptionPlanSchema.virtual('accessURL').get(function() {
  return `/subscription-plans/${this.slug}`;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Pre-save middleware for business logic validation
 */
SubscriptionPlanSchema.pre('save', function(next) {
  const plan = this;

  // Update timestamps for audit trail
  plan.audit.updatedAt = new Date();

  // Auto-increment version on significant changes
  if (plan.isModified()) {
    plan.audit.version += 1;
  }

  // Business rule validation
  if (plan.pricing.price < 0) {
    next(new Error('Price cannot be negative'));
    return;
  }

  if (plan.pricing.originalPrice && plan.pricing.originalPrice <= plan.pricing.price) {
    next(new Error('Original price must be higher than current price'));
    return;
  }

  if (plan.business.sortOrder > 999 || plan.business.sortOrder < 0) {
    next(new Error('Sort order must be between 0 and 999'));
    return;
  }

  // Validate course access levels
  for (const course of plan.includedCourses) {
    if (course.restrictions &&
        course.restrictions.validDays &&
        course.restrictions.validDays <= 0) {
      next(new Error('Valid days restriction must be greater than 0'));
      return;
    }
  }

  next();
});

/**
 * Pre-find middleware to automatically filter out archived plans
 */
SubscriptionPlanSchema.pre(/^find/, function(next) {
  this.where({ 'audit.isArchived': { $ne: true } });
  next();
});

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get active and visible plans ordered by popularity and pricing
 */
SubscriptionPlanSchema.static('getActivePlans', function(limit = 50) {
  return this.find({
    'business.isActive': true,
    'business.isVisible': true
  })
  .sort({ 'business.isPopular': -1, 'business.sortOrder': 1, 'pricing.price': 1 })
  .limit(limit);
});

/**
 * Get popular plans for homepage display
 */
SubscriptionPlanSchema.static('getPopularPlans', function(limit = 3) {
  return this.find({
    'business.isActive': true,
    'business.isVisible': true,
    'business.isPopular': true
  })
  .sort({ 'analytics.subscriberCount': -1 })
  .limit(limit);
});

/**
 * Get plans by skill level
 */
SubscriptionPlanSchema.static('getPlansBySkillLevel', function(skillLevel) {
  return this.find({
    'business.isActive': true,
    'business.isVisible': true,
    'business.skillLevels': skillLevel
  })
  .sort({ 'pricing.price': 1 });
});

/**
 * Get plans by price range
 */
SubscriptionPlanSchema.static('getPlansByPriceRange', function(min, max, currency = 'INR') {
  return this.find({
    'business.isActive': true,
    'business.isVisible': true,
    'pricing.currency': currency,
    'pricing.price': { $gte: min, $lte: max }
  })
  .sort({ 'pricing.price': 1 });
});

/**
 * Search plans with full-text search
 */
SubscriptionPlanSchema.static('searchPlans', function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    'business.isActive': true,
    'business.isVisible': true,
    ...filters
  };

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Add course to plan with validation
 */
SubscriptionPlanSchema.method('addCourse', function(courseId, accessLevel = 'full', restrictions = {}) {
  const existingIndex = this.includedCourses.findIndex(
    course => course.courseId.toString() === courseId.toString()
  );

  if (existingIndex !== -1) {
    throw new Error('Course is already included in this plan');
  }

  this.includedCourses.push({
    courseId,
    accessLevel,
    restrictions: { ...restrictions },
    metadata: { addedAt: new Date() }
  });

  return this.save();
});

/**
 * Remove course from plan
 */
SubscriptionPlanSchema.method('removeCourse', function(courseId) {
  const index = this.includedCourses.findIndex(
    course => course.courseId.toString() === courseId.toString()
  );

  if (index === -1) {
    throw new Error('Course is not included in this plan');
  }

  this.includedCourses.splice(index, 1);
  return this.save();
});

/**
 * Update course access level
 */
SubscriptionPlanSchema.method('updateCourseAccess', function(courseId, accessLevel, restrictions = {}) {
  const course = this.includedCourses.find(
    course => course.courseId.toString() === courseId.toString()
  );

  if (!course) {
    throw new Error('Course is not included in this plan');
  }

  course.accessLevel = accessLevel;
  course.restrictions = { ...course.restrictions, ...restrictions };
  course.metadata.updatedAt = new Date();

  return this.save();
});

/**
 * Calculate effective price considering discounts
 */
SubscriptionPlanSchema.method('getEffectivePrice', function() {
  const basePrice = this.pricing.price;

  // Apply discount if applicable
  if (this.hasDiscount) {
    return this.pricing.price - this.discountAmount;
  }

  return basePrice;
});

/**
 * Archive the plan (soft delete)
 */
SubscriptionPlanSchema.method('archive', function(userId) {
  this.business.isActive = false;
  this.audit.isArchived = true;
  this.audit.archivedAt = new Date();
  this.audit.updatedBy = userId;

  return this.save();
});

/**
 * Publish the plan
 */
SubscriptionPlanSchema.method('publish', function(userId) {
  this.business.isVisible = true;
  this.business.isActive = true;
  this.audit.updatedBy = userId;

  return this.save();
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
