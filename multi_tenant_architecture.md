# Multi-Tenant Architecture Implementation Guide for AiShield India Platform

## Overview

Multi-tenant architecture will transform the AiShield India platform into a SaaS (Software as a Service) solution where multiple organizations can operate their own separate learning platforms while sharing the same underlying infrastructure. This implementation enables scalability, reduces operational costs, and creates new business opportunities.

## Business Value

- **White-label Solutions**: Organizations can brand the platform as their own
- **Institutional Licensing**: Universities, training centers, and corporate training programs
- **Regional Content**: Localized content for specific markets or industries
- **Isolated Environments**: Each tenant has complete data isolation
- **Centralized Maintenance**: Single codebase servicing multiple tenants

## Architecture Strategy

### Multi-Tenancy Patterns

1. **Separate Database per Tenant**
   - Complete data isolation
   - Highest security guarantees
   - More complex scaling and maintenance

2. **Shared Database with Schema Separation**
   - Database-level separation (recommended approach)
   - Easier scaling and maintenance
   - Shared resources with isolation

3. **Shared Database with Row-level Security**
   - Single database schema
   - Row-level partitioning for data isolation
   - Most efficient resource utilization

**Recommended Approach**: Shared Database with Schema Separation for optimal balance of isolation, performance, and maintainability.

## Database Schema Changes

### Tenant Model

```javascript
const Tenant = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subdomain: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  logoUrl: String,
  branding: {
    primaryColor: String,
    secondaryColor: String,
    customCSS: String
  },
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter'
  },
  features: {
    maxUsers: Number,
    maxLectures: Number,
    customBranding: Boolean,
    analytics: Boolean,
    apiAccess: Boolean
  },
  contact: {
    adminEmail: String,
    billingEmail: String,
    supportEmail: String
  },
  settings: {
    allowedDomains: [String], // for corporate tenants
    defaultLanguage: String,
    customPages: Object
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  subscription: {
    status: String,
    startDate: Date,
    endDate: Date,
    billingCycle: String
  },
  createdAt: Date,
  updatedAt: Date
});
```

### Updated User Model

```javascript
const User = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  name: String,
  password: String,
  role: {
    type: String,
    enum: ['learner', 'instructor', 'tenant_admin', 'super_admin'],
    default: 'learner'
  },
  profile: {
    avatar: String,
    bio: String,
    department: String,
    employeeId: String
  },
  isSubscribed: {
    type: Boolean,
    default: false
  },
  subscriptionEndDate: Date,
  lectureProgress: [{
    lectureId: mongoose.Schema.Types.ObjectId,
    completed: Boolean,
    progress: Number,
    completedAt: Date
  }],
  permissions: [{
    resource: String,
    actions: [String]
  }],
  createdAt: Date,
  updatedAt: Date,
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }]
});
```

### Updated Content Models

```javascript
const Lecture = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: String,
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  order: Number,
  isActive: Boolean,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    difficulty: String,
    duration: Number,
    tags: [String]
  },
  createdAt: Date,
  updatedAt: Date
});

const Category = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: String,
  description: String,
  order: Number,
  isActive: Boolean,
  icon: String,
  createdAt: Date,
  updatedAt: Date
});
```

## Middleware Implementation

### Tenant Identification Middleware

```javascript
const tenantIdentification = (req, res, next) => {
  // Try to identify tenant from subdomain
  const host = req.headers.host;
  const subdomain = host.split('.')[0];

  // Skip if it's the main domain
  if (subdomain === 'app' || subdomain === process.env.MAIN_DOMAIN) {
    return next(); // No tenant context for main platform
  }

  // Find tenant by subdomain
  const tenant = await mongoose.model('Tenant').findOne({
    subdomain: subdomain,
    status: 'active'
  });

  if (!tenant) {
    return res.status(404).json({
      error: 'Tenant not found',
      message: 'The requested organization is not configured properly.'
    });
  }

  // Attach tenant to request object
  req.tenant = tenant;
  req.tenantId = tenant._id;

  next();
};
```

### Tenant-Specific Database Connection

```javascript
class MultiTenantDatabase {
  constructor() {
    this.connections = new Map();
  }

  async getTenantConnection(tenantId) {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId);
    }

    // For shared schema approach, use the main connection
    // For separate database approach, create new connection
    const connection = await this.createConnection(tenantId);
    this.connections.set(tenantId, connection);

    return connection;
  }

  async createConnection(tenantId) {
    // Implementation for separate databases per tenant
    const connection = mongoose.createConnection(`${process.env.MONGO_URI}/${tenantId}`);

    // Register models on the tenant-specific connection
    this.registerTenantModels(connection, tenantId);

    return connection;
  }

  registerTenantModels(connection, tenantId) {
    // Register tenant-scoped models
    connection.model('User', UserSchema);
    connection.model('Lecture', LectureSchema);
    connection.model('Category', CategorySchema);
    connection.model('FileCategory', FileCategorySchema);
  }
}
```

## Authentication & Authorization

### Multi-Level Role System

1. **Super Admin** (Platform Level)
   - Manages all tenants
   - Platform maintenance and billing
   - Global analytics

2. **Tenant Admin** (Organization Level)
   - Manages their organization
   - User management within their tenant
   - Content management and branding

3. **Instructor** (Content Level)
   - Creates and manages educational content
   - Student progress monitoring
   - Assessment management

4. **Learner** (Student Level)
   - Access to learning materials
   - Track personal progress
   - Participate in assessments

### Enhanced JWT Payload

```javascript
const tokenPayload = {
  userId: user._id,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId, // Critical for multi-tenant context
  permissions: user.permissions,
  exp: expirationTime,
  iat: issuedAtTime,
  iss: 'aishield-platform',
  tenant: tenant.subdomain // For easy identification
};
```

## Content Isolation & Access Control

### Tenant-Scoped Content Access

```javascript
// Middleware to ensure users can only access their tenant's content
const tenantContentGuard = (req, res, next) => {
  const userTenantId = req.user.tenantId;
  const requestedContentTenantId = req.requestedContentId?.tenantId;

  if (requestedContentTenantId && requestedContentTenantId !== userTenantId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access content from your organization.'
    });
  }

  next();
};
```

### Content Upload with Tenant Context

```javascript
// Ensure all uploaded content is tagged with tenant ID
const contentUploadHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const { title, content, categories } = req.body;

  const lecture = new Lecture({
    tenantId,
    title,
    content,
    categories,
    createdBy: req.user._id,
    createdAt: new Date()
  });

  await lecture.save();
  res.json({ message: 'Lecture uploaded successfully', lecture });
};
```

## Branding & Customization

### Dynamic Branding System

```javascript
class TenantBrandingService {
  async getTenantBranding(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    return {
      logo: tenant.logoUrl,
      colors: tenant.branding,
      customCSS: tenant.branding.customCSS,
      name: tenant.displayName
    };
  }

  async applyBrandingToFrontend(req, res, next) {
    if (req.tenant) {
      const branding = await this.getTenantBranding(req.tenant._id);
      res.locals.branding = branding;
    }
    next();
  }
}
```

### Custom Frontend Configuration

```javascript
// Dynamic configuration based on tenant
window.tenantConfig = {
  branding: {
    logo: '/tenant-logos/tenant-logo.png',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d'
  },
  features: {
    enabledModules: ['dashboard', 'lectures', 'assessment'],
    customNavItems: [],
    footerLinks: []
  },
  api: {
    baseUrl: 'https://api.aishield.in',
    tenantSubdomain: 'company'
  }
};
```

## Billing & Subscription Management

### Tenant-Specific Billing

```javascript
const TenantBilling = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise']
  },
  pricing: {
    monthlyFee: Number,
    userFee: Number, // per user
    transactionFee: Number // percentage for payments
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'quarterly'],
    default: 'monthly'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'bank_transfer', 'invoice']
  },
  billingContact: {
    name: String,
    email: String,
    address: Object
  },
  autoRenewal: {
    type: Boolean,
    default: true
  },
  nextBillingDate: Date,
  paymentHistory: [{
    amount: Number,
    date: Date,
    status: String,
    invoiceUrl: String
  }]
});
```

### Usage-based Billing Implementation

```javascript
class TenantBillingService {
  async calculateTenantBill(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    const users = await User.countDocuments({ tenantId, isSubscribed: true });
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const bill = {
      baseFee: tenant.plan === 'starter' ? 5000 : tenant.plan === 'professional' ? 15000 : 50000,
      userFee: users * 500, // ₹500 per user
      usage: await this.calculateUsage(tenantId, startDate, endDate),
      total: 0
    };

    bill.total = bill.baseFee + bill.userFee + bill.usage.transactionFees;
    return bill;
  }

  async generateInvoice(tenantId, bill) {
    // Generate PDF invoice with Razorpay integration
    const invoice = {
      tenantId,
      amount: bill.total,
      items: [],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date()
    };

    // Add invoice items
    invoice.items.push({
      description: 'Base Platform Fee',
      amount: bill.baseFee
    });
    invoice.items.push({
      description: `User Subscriptions (${bill.userFee / 500} users)`,
      amount: bill.userFee
    });

    return invoice;
  }
}
```

## API Gateway & Routing

### Subdomain-based Routing

```javascript
// Express middleware for tenant-specific routing
app.use((req, res, next) => {
  const host = req.headers.host;
  const parts = host.split('.');

  // Handle subdomains like company.aishield.in
  if (parts.length >= 3) {
    const subdomain = parts[0];
    req.subdomain = subdomain;

    // Set tenant-specific API routes
    req.apiBase = `/api/tenant/${subdomain}`;

    // Tenant-specific static files
    if (req.path.startsWith('/static/')) {
      const tenantStaticPath = path.join(__dirname, 'tenants', subdomain, 'static');
      express.static(tenantStaticPath)(req, res, next);
      return;
    }
  }

  next();
});
```

### Tenant Isolation in API Routes

```javascript
// All routes now tenant-aware
router.use((req, res, next) => {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant required',
      message: 'All requests must include tenant context'
    });
  }
  next();
});

// Tenant-scoped user routes
router.get('/users', async (req, res) => {
  const users = await User.find({ tenantId: req.tenantId });
  res.json({ users });
});

// Tenant-scoped content routes
router.post('/lectures', async (req, res) => {
  const lecture = new Lecture({
    ...req.body,
    tenantId: req.tenantId,
    createdBy: req.user._id
  });
  await lecture.save();
  res.json({ lecture });
});
```

## Security Considerations

### Data Protection & Isolation

1. **Database Level Security**
   - Use MongoDB's access controls
   - Separate read/write permissions per tenant
   - Encrypted data at rest

2. **API Level Security**
   - Tenant context validation on all requests
   - Cross-tenant data leakage prevention
   - Rate limiting per tenant

3. **Application Level Security**
   - Secure tenant configuration storage
   - Audit logging for tenant actions
   - Encryption for sensitive tenant data

### Tenant-Specific Rate Limiting

```javascript
const tenantRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req, res) => {
    // Different limits based on tenant plan
    const tenant = res.locals.tenant;
    return tenant && tenant.plan === 'enterprise' ? 1000 : 100;
  },
  keyGenerator: (req) => {
    return `${req.tenantId}_${req.ip}`; // Tenant-specifc rate limiting
  },
  message: 'Too many requests from this tenant. Please try again later.'
});

app.use('/api/', tenantRateLimiter);
```

## Implementation Phases

### Phase 1: Core Multi-Tenant Infrastructure
- [ ] Database schema updates with tenantId fields
- [ ] Tenant identification middleware
- [ ] User model updates with tenant context
- [ ] Basic tenant creation/management

### Phase 2: Security & Isolation
- [ ] Data access layer with tenant isolation
- [ ] Authentication updates for multi-tenant context
- [ ] Admin role system implementation
- [ ] Content access control middleware

### Phase 3: Branding & UI Customization
- [ ] Dynamic branding system
- [ ] Tenant-specific frontend configuration
- [ ] Custom CSS and theming support
- [ ] White-label solution implementation

### Phase 4: Billing & Analytics
- [ ] Tenant-specific billing system
- [ ] Usage tracking and metering
- [ ] Analytics dashboard for tenants
- [ ] Payment integration per tenant

### Phase 5: Advanced Features
- [ ] Multi-tenant APIs
- [ ] Automated tenant onboarding
- [ ] Tenant migration tools
- [ ] Performance optimization

## Migration Strategy

### Data Migration Process

1. **Current System Assessment**
   - Analyze existing data structure
   - Identify tenant boundaries
   - Plan migration scope

2. **Incremental Migration**
   - Create migration scripts
   - Test migration on staging environment
   - Gradual rollout to production

3. **Downtime Minimization**
   - Parallel system operation during migration
   - Fallback mechanisms
   - Rollback procedures

## Performance Optimization

### Caching Strategies

```javascript
class TenantCacheService {
  constructor() {
    this.cache = new Map();
  }

  async getTenantData(tenantId, cacheKey) {
    const cacheNamespace = `tenant_${tenantId}`;

    if (this.cache.has(`${cacheNamespace}_${cacheKey}`)) {
      return this.cache.get(`${cacheNamespace}_${cacheKey}`);
    }

    // Fetch data from database
    const data = await this.fetchData(tenantId, cacheKey);

    // Cache with TTL
    this.setCache(`${cacheNamespace}_${cacheKey}`, data, 300000); // 5 minutes

    return data;
  }

  setCache(key, value, ttl) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
}
```

### Database Optimization

1. **Indexing Strategy**
   - Composite indexes with tenantId first
   - Sharding based on tenantId
   - Query optimization for tenant-scoped data

2. **Connection Pooling**
   - Separate connection pools per tenant (if using separate databases)
   - Connection reuse for shared database approach

3. **Read Optimization**
   - Database read replicas
   - Caching layer for frequently accessed data
   - Optimized query patterns

## Testing Strategy

### Multi-Tenant Specific Tests

1. **Isolation Testing**
   - Ensure tenant data cannot be accessed cross-tenant
   - Test boundary conditions for data access
   - Authentication edge cases

2. **Performance Testing**
   - Load testing with multiple tenants
   - Database performance under concurrent tenant loads
   - API response times for different tenant sizes

3. **Integration Testing**
   - End-to-end workflows for each tenant type
   - Billing and subscription workflows
   - Content upload and access workflows

## Monitoring & Analytics

### Platform-Level Monitoring

```javascript
class MultiTenantMonitor {
  async collectTenantMetrics() {
    const tenants = await Tenant.find({ status: 'active' });

    for (const tenant of tenants) {
      await this.collectTenantUsage(tenant._id);
      await this.monitorTenantHealth(tenant._id);
      await this.trackTenantRevenue(tenant._id);
    }
  }

  async collectTenantUsage(tenantId) {
    const metrics = {
      usersCount: await User.countDocuments({ tenantId }),
      lecturesCount: await Lecture.countDocuments({ tenantId }),
      apiCallsToday: await this.getAPICallsForTenant(tenantId),
      revenueThisMonth: await this.calculateMonthlyRevenue(tenantId),
      storageUsed: await this.calculateStorageUsage(tenantId)
    };

    await this.storeTenantMetrics(tenantId, metrics);
  }
}
```

### Error Tracking Per Tenant

```javascript
const tenantErrorHandler = (error, req, res, next) => {
  // Log error with tenant context
  console.error(`[${req.tenant?.name || 'Main'}] Error:`, error);
  logError({
    tenantId: req.tenantId,
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    path: req.path,
    method: req.method
  });

  next(error); // Pass to general error handler
};
```

## Compliance & Governance

### Data Privacy & GDPR

1. **Tenant Data Isolation**
   - Physical data separation where required
   - Data encryption at rest and in transit
   - Tenant-specific data retention policies

2. **Consent Management**
   - User consent tracking per tenant
   - Audit trails for data access
   - Data export/deletion capabilities

3. **Tenant Rights Management**
   - Tenant-specific GDPR compliance settings
   - Data portability for tenants
   - Automated data cleanup procedures

### Security Compliance

1. **SOC 2 Compliance**
   - Security controls documentation
   - Access control procedures
   - Incident response plans

2. **Multi-Tenant Security**
   - Cross-tenant vulnerability assessment
   - Penetration testing for tenant isolation
   - Security monitoring per tenant

This comprehensive multi-tenant architecture will enable AiShield India to scale from a single platform to a multi-organization education ecosystem while maintaining security, performance, and compliance standards.

The implementation requires careful planning, iterative development, and thorough testing to ensure all tenant contexts are properly handled throughout the application stack.
