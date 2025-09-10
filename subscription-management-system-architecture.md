# Enterprise Subscription Plan Management System Architecture

## 📋 System Overview

This document outlines the professional implementation of a subscription plan management system for an online learning platform focusing on penetration testing courses.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Admin Dashboard Components                             │ │
│  │ - SubscriptionPlanManagement                          │ │
│  │ - PaymentManagement                                   │ │
│  │ - SubscriptionAnalytics                               │ │
│  │ - UserSubscriptionManager                             │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP/HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ REST API Endpoints                                     │ │
│  │ - POST   /api/subscription-plans                   │ │
│  │ - GET    /api/subscription-plans/{id}              │ │
│  │ - PUT    /api/subscription-plans/{id}              │ │
│  │ - DELETE /api/subscription-plans/{id}              │ │
│  │ - POST   /api/subscription-plans/{id}/subscribe    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ Service Bus
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                Service Layer                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ SubscriptionPlanService                                │ │
│  │ - validatePlanData()                                  │ │
│  │ - calculatePricing()                                  │ │
│  │ - handleCourseAssignment()                            │ │
│  │ - processSubscription()                               │ │
│  │                                                       │ │
│  │ PaymentService                                         │ │
│  │ - initiatePayment()                                   │ │
│  │ - verifyPayment()                                     │ │
│  │ - handleWebhook()                                     │ │
│  │                                                       │ │
│  │ NotificationService                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ Persistence API
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Access Layer                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Repository Classes                                      │ │
│  │ - SubscriptionPlanRepository                          │ │
│  │ - PaymentRepository                                    │ │
│  │ - UserRepository                                       │ │
│  │ - CourseRepository                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ Database Operations
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database Layer                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ MongoDB Collections                                     │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ SubscriptionPlans                                    │ │ │
│  │ │ UserSubscriptions                                     │ │ │
│  │ │ PaymentTransactions                                   │ │ │
│  │ │ CourseAssignments                                     │ │ │
│  │ │ AuditLogs                                            │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🗃️ Database Schema Design

### 1. SubscriptionPlan Collection

```javascript
{
  _id: ObjectId,
  name: String, // Required, Unique
  slug: String, // Required, Unique, Lowercase
  description: String, // Required, Max 1000 chars
  shortDescription: String, // Max 200 chars

  // Pricing Structure
  pricing: {
    currency: String, // INR, USD, EUR
    price: Number, // Base price
    originalPrice: Number, // Strike-through price
    discountPercentage: Number,
    setupFee: Number,

    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'lifetime']
    }
  },

  // Course Access
  includedCourses: [{
    courseId: ObjectId, // Reference to Course
    courseName: String, // Cached for performance
    courseSlug: String, // Cached for performance
    accessLevel: {
      type: String,
      enum: ['full', 'restricted', 'preview']
    },
    restrictions: {
      maxEnrollments: Number,
      validDays: Number,
      allowedCategories: [String]
    }
  }],

  // Business Rules
  business: {
    isActive: Boolean,
    isVisible: Boolean,
    isPopular: Boolean,
    isRecommended: Boolean,
    targetAudience: [String],
    targetOccupations: [String],
    skillLevels: [{
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }],
    sortOrder: Number,
    maxSubscriptions: Number
  },

  // Features and Benefits
  features: {
    unlimitedLectures: Boolean,
    prioritySupport: Boolean,
    downloadableContent: Boolean,
    certificates: Boolean,
    lifetimeAccess: Boolean,
    communityAccess: Boolean,
    mentoringSessions: Number,
    customLearningPaths: Boolean,
    progressTracking: Boolean,
    mobileAccess: Boolean,
    offlineAccess: Boolean
  },

  // Analytics and Metrics
  analytics: {
    subscriberCount: Number,
    activeSubscriptions: Number,
    totalRevenue: Number,
    averageRating: Number,
    churnRate: Number,
    conversionRate: Number,
    lifetimeValue: Number
  },

  // Audit Trail
  audit: {
    createdBy: ObjectId, // User who created
    updatedBy: ObjectId, // User who last updated
    createdAt: Date,
    updatedAt: Date,
    version: Number
  }
}
```

### 2. UserSubscription Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  planId: ObjectId, // Reference to SubscriptionPlan

  // Subscription Details
  subscriptionInfo: {
    name: String, // Cached plan name
    slug: String, // Cached plan slug
    billingCycle: String,
    price: Number,
    currency: String,
    status: {
      type: String,
      enum: ['active', 'trial', 'grace', 'cancelled', 'expired', 'suspended']
    }
  },

  // Billing Details
  billing: {
    startDate: Date,
    endDate: Date,
    nextBillingDate: Date,
    trialEndDate: Date,
    paidThroughDate: Date,
    autoRenew: Boolean,
    pausesRemaining: Number
  },

  // Payment Information
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet']
    },
    referenceId: String,
    maskedNumber: String
  },

  // Usage Analytics
  usage: {
    coursesAccessed: [ObjectId], // Courses accessed this billing cycle
    lecturesCompleted: Number,
    certificatesEarned: Number,
    loginFrequency: Number,
    engagementScore: Number
  },

  // Audit Information
  audit: {
    initiatedAt: Date,
    createdAt: Date,
    updatedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    version: Number
  }
}
```

### 3. Payment Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  subscriptionId: ObjectId,
  planId: ObjectId,

  // Transaction Details
  transaction: {
    gateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'manual']
    },
    gatewayTransactionId: String,
    orderId: String,
    paymentId: String,
    referenceCode: String,
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled']
    }
  },

  // Business Context
  billingCycle: String,
  billingPeriod: {
    start: Date,
    end: Date
  },

  // Payment Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceId: String,
    sessionId: String,
    refererURL: String
  },

  // Audit Trail
  audit: {
    initiatedAt: Date,
    completedAt: Date,
    failedAt: Date,
    failureReason: String,
    retries: Number,
    processedBy: String
  }
}
```

## 🏢 Service Layer Architecture

### SubscriptionPlanService

- **validatePlanData()**: Comprehensive validation
- **calculatePricing()**: Dynamic pricing calculations
- **handleCourseAssignment()**: Intelligent course mapping
- **processSubscription()**: Subscription lifecycle management
- **handleAnalytics()**: Metrics and reporting
- **auditTrail()**: Change tracking and history

### PaymentService

- **initiatePayment()**: Gateway integration
- **verifyPayment()**: Security verification
- **handleWebhook()**: Event processing
- **processRefund()**: Refund management
- **handleDispute()**: Dispute resolution

### NotificationService

- **sendSubscriptionConfirmation()**: Welcome messages
- **sendPaymentReceipt()**: Transaction receipts
- **sendRenewalReminder()**: Proactive notifications
- **handleFailedPayment()**: Error notifications

## 🔐 Security & Validation Layer

### Authentication & Authorization

- JWT token validation with refresh mechanism
- Role-based access control (RBAC)
- API rate limiting per user/type
- Session management and tracking
- Cross-origin protection

### Data Validation

- Schema-based validation using Mongoose
- Business rule validation layers
- Input sanitization and normalization
- SQL injection prevention
- Cross-site scripting (XSS) protection

### Payment Security

- PCI DSS compliance compliance
- SSL/TLS encryption for all transactions
- Digital signature verification
- Fraud detection mechanisms
- Secure credential management

## 📊 Analytics & Monitoring

### Real-time Metrics

- Subscription conversion rates
- Revenue tracking and forecasting
- Churn rate monitoring
- User engagement analytics
- Performance metrics

### Business Intelligence

- Cohort analysis
- Lifetime value calculations
- A/B testing frameworks
- Predictive analytics
- Operational dashboards

## 🔄 API Design Principles

### RESTful Endpoints

```
Subscription Plans:
GET    /api/v1/subscription-plans          # List published plans
GET    /api/v1/subscription-plans/{id}     # Get specific plan
POST   /api/v1/subscription-plans          # Create new plan (Admin)
PUT    /api/v1/subscription-plans/{id}     # Update plan (Admin)
DELETE /api/v1/subscription-plans/{id}     # Archive plan (Admin)

User Subscriptions:
GET    /api/v1/my-subscription             # Get current subscription
POST   /api/v1/subscribe/{planId}          # Subscribe to plan
PUT    /api/v1/subscription/cancel         # Cancel subscription
GET    /api/v1/subscription/history        # Subscription history

Admin Analytics:
GET    /api/v1/admin/analytics/plans       # Plan performance
GET    /api/v1/admin/analytics/revenue     # Revenue metrics
GET    /api/v1/admin/analytics/churn       # Churn analysis

Payment Operations:
POST   /api/v1/payment/initiate            # Start payment
POST   /api/v1/payment/verify              # Verify payment
POST   /api/v1/webhook/payment             # Handle webhooks
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid subscription plan data",
    "details": {
      "name": "Plan name is required",
      "pricing.price": "Price must be greater than 0"
    },
    "timestamp": "2025-09-08T06:11:30.000Z",
    "requestId": "req_1234567890",
    "path": "/api/v1/subscription-plans"
  }
}
```

### Successful Response Format

```json
{
  "success": true,
  "data": {
    "subscriptionPlan": { ... },
    "metadata": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 23,
      "itemsPerPage": 10
    }
  },
  "timestamp": "2025-09-08T06:11:30.000Z",
  "requestId": "req_1234567890"
}
```

## 🚀 Deployment & Scaling

### Microservices Considerations

- Horizontal scaling for different components
- Message queue for asynchronous processing
- Database connection pooling
- CDN integration for static assets

### Performance Optimization

- Database indexing strategy
- Query result caching
- Content Delivery Network (CDN)
- Database read replicas
- API response compression

This architecture provides a solid foundation for a professional, enterprise-grade subscription plan management system with comprehensive features, security, and scalability considerations.