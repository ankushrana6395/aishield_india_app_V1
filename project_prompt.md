# Detailed Project Prompt: AiShield India Penetration Testing Learning Platform

## Project Overview

Create a comprehensive, secure, subscription-based online learning platform specifically designed for web application penetration testing (pentest) education. The platform should serve as a complete e-learning solution for cybersecurity professionals, students, and IT security enthusiasts looking to master web application security testing methodologies and techniques.

## Core Objectives

1. **Educational Excellence**: Provide high-quality, structured pentest learning content covering all major web application vulnerabilities
2. **Security-First Design**: Implement enterprise-grade security measures throughout the application
3. **Subscription Business Model**: Monetize educational content effectively while ensuring accessibility
4. **Admin Efficiency**: Provide powerful content management and user administration tools
5. **Scalable Architecture**: Build a robust, maintainable codebase that can grow with the platform

## Technical Architecture

### Backend Stack
- **Runtime**: Node.js with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication with session management
- **Security**: Helmet.js, rate limiting, CORS protection
- **Payment Processing**: Razorpay integration for India-focused payments
- **File Management**: Database-stored HTML lecture content with categorization

### Frontend Stack
- **Framework**: React.js with modern hooks and context API
- **UI Library**: Material-UI (MUI) for professional, responsive design
- **Routing**: React Router for client-side navigation
- **HTTP Client**: Axios for API communication
- **State Management**: React Context API with local storage persistence

## Key Features

### User Management System
- Registration and login (email/password + social auth)
- JWT token-based authentication
- Role-based access control (user/admin)
- Profile management and progress tracking
- Session management and security

### Subscription & Payment System
- Razorpay payment gateway integration
- Multiple subscription tiers
- Payment verification and webhook handling
- Subscription status management
- Automated billing and renewal

### Content Management System
- HTML-based lecture content storage
- Lecture categorization and organization
- Progress tracking per user
- Content access control based on subscription
- Support for both file-based and database-stored lectures

### Admin Dashboard
- User management (view, edit, delete users)
- Subscriber management and analytics
- Content upload and management
- Category management
- Platform analytics and reporting

### Learning Features
- Interactive lecture viewing with progress tracking
- Organized categories (SQL Injection, XSS, CSRF, etc.)
- Sequential learning paths
- Progress indicators and completion tracking
- Responsive design for mobile and desktop

## Application Structure

```
/                      # Homepage with platform overview
/login                 # User authentication
/register              # User registration
/dashboard             # User learning dashboard
/lecture/:filename     # Lecture viewing (file-based)
/lecture/database/:slug # Lecture viewing (database-based)
/payment               # Subscription payment page
/admin/*               # Admin panel routes
```

## Data Models

### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  role: String (user/admin),
  isSubscribed: Boolean,
  subscriptionEndDate: Date,
  lectureProgress: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### Lecture Model
```javascript
{
  title: String,
  content: String,
  slug: String,
  category: ObjectId,
  order: Number,
  isActive: Boolean,
  createdAt: Date
}
```

### FileCategory Model
```javascript
{
  filename: String,
  title: String,
  description: String,
  category: ObjectId,
  content: Buffer/String,
  createdAt: Date
}
```

### Category Model
```javascript
{
  name: String,
  description: String,
  order: Number,
  isActive: Boolean,
  lectureCount: Number
}
```

## Security Requirements

### Authentication Security
- Password hashing with bcrypt
- JWT token expiration and refresh
- Rate limiting for login attempts
- Session management and secure cookies
- Password reset functionality

### Content Security
- Protected content access only for authenticated subscribed users
- Database-level content storage and retrieval
- Prevention of unauthorized content access
- Content integrity verification

### Application Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- HTTPS enforcement

## API Endpoints

### Authentication Routes (`/api/auth`)
- POST `/register` - User registration
- POST `/login` - User authentication
- POST `/logout` - User logout
- GET `/profile` - Get user profile
- PUT `/profile` - Update user profile

### Content Routes (`/api/content`)
- GET `/lectures` - Get available lectures
- GET `/lecture-content/:filename` - Get lecture content
- GET `/progress` - Get user progress
- GET `/categories` - Get categories
- GET `/lectures/category/:categoryId` - Get lectures by category

### Payment Routes (`/api/payment`)
- POST `/create-order` - Create Razorpay order
- POST `/verify-payment` - Verify payment
- GET `/subscription-status` - Check subscription status

### Admin Routes (`/api/admin`)
- GET `/users` - Get all users
- GET `/subscribers` - Get subscribed users
- POST `/upload-lecture` - Upload lecture content
- DELETE `/delete-lecture/:id` - Delete lecture
- GET `/analytics` - Get platform analytics

### Multi-Tenant Super Admin Routes
- POST `/tenants` - Create new tenant organizations
- GET `/tenants` - Get all tenant organizations
- PUT `/tenants/:tenantId` - Update tenant settings
- DELETE `/tenants/:tenantId` - Deactivate tenant
- GET `/tenants/:tenantId/analytics` - Get tenant-specific analytics
- GET `/tenants/:tenantId/users` - Get users for specific tenant
- POST `/tenants/:tenantId/admins` - Create tenant admin
- DELETE `/tenants/:tenantId/admins/:adminId` - Remove tenant admin

## Frontend Components

### Core Components
- **Navbar**: Navigation with conditional rendering based on auth status
- **Home**: Landing page with course overview
- **Login/Register**: Authentication forms
- **Dashboard**: User learning dashboard with progress
- **LectureViewer**: HTML lecture content renderer
- **PaymentPage**: Razorpay payment integration
- **AdminDashboard**: Comprehensive admin interface

### Context Providers
- **AuthContext**: Global authentication state management
- **LectureContext**: Lecture data and progress management

## Pentest Learning Content Categories

1. **Web Application Basics**
2. **Access Control Vulnerabilities**
3. **Authentication Vulnerabilities**
4. **Authorization Vulnerabilities**
5. **Input Validation Issues**
6. **SQL Injection**
7. **Cross-Site Scripting (XSS)**
8. **Cross-Site Request Forgery (CSRF)**
9. **XML External Entity (XXE)**
10. **Server-Side Request Forgery (SSRF)**
11. **Host Header Attacks**
12. **HTTP Request Smuggling**
13. **Insecure Deserialization**
14. **Business Logic Vulnerabilities**
15. **Race Conditions**
16. **Directory Traversal**
17. **Command Injection**
18. **CORS Misconfigurations**
19. **Web Cache Poisoning**
20. **GraphQL Vulnerabilities**
21. **WebSocket Security**
22. **OAuth 2.0 Vulnerabilities**
23. **JWT Security**
24. **File Upload Vulnerabilities**

## Deployment & DevOps

### Environment Configuration
- Development (localhost:3000 frontend, localhost:5000 backend)
- Production (cloud hosting with process.env configuration)
- Database (local MongoDB for dev, MongoDB Atlas for production)

### Deployment Pipeline
- Frontend: Vercel/Netlify for static hosting
- Backend: Render/Railway/Heroku for Node.js hosting
- Database: MongoDB Atlas
- SSL/TLS certificates
- Environment variable management

### Monitoring & Analytics
- Server health checks
- Error logging and monitoring
- User analytics and engagement tracking
- Payment processing monitoring
- Performance optimization

## Development Guidelines

### Code Standards
- ESLint and Prettier configuration
- Consistent naming conventions
- Comprehensive error handling
- Clean, readable, maintainable code
- Proper separation of concerns

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Security testing and vulnerability assessment

### Documentation
- API documentation with Swagger/OpenAPI
- Component documentation
- Setup and deployment guides
- Code commenting and README files

## Future Enhancements

- Mobile app (React Native)
- Advanced progress analytics
- Quiz/assessment system
- Discussion forums
- Certificate generation
- Advanced admin analytics
- Content recommendation system
- Gamification features
- Integration with cybersecurity tools

*[Multi-tenant architecture implementation detailed separately](./multi_tenant_architecture.md)*

This comprehensive platform represents a complete solution for pentest education, combining technical excellence with business viability and user experience excellence.
