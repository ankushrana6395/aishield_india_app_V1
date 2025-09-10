# Course-Based Subscription System Implementation Guide

## Overview

This feature implements a comprehensive course-based subscription system for the AiShield India platform, allowing administrators to create structured courses and subscription plans with granular access control to specific courses and their content.

## Business Value

- **Structured Learning Paths**: Organize education content into logical, comprehensive courses
- **Flexible Monetization**: Create different subscription tiers with varying course access
- **Targeted Offerings**: Custom subscription packages for specific professional needs
- **Scalable Content Organization**: Better content management and user experience
- **Revenue Optimization**: Multiple revenue streams based on course value and demand

## Feature Architecture

### Core Concept Hierarchy
```
Platform
├── Courses (with Categories & Lectures)
└── Subscription Plans (control access to Courses)
    └── User Subscriptions (individual access permissions)
```

## Database Schema Changes

### Course Model

```javascript
const Course = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  instructor: {
    type: String,
    required: true
  },
  thumbnail: String, // Course thumbnail image URL
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner'
  },
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  tags: [String],

  // Prerequisites and Requirements
  prerequisites: [String],
  learningObjectives: [String],

  // Content Structure
  categories: [{
    name: String,
    description: String,
    order: Number,
    lectures: [{
      title: String,
      slug: String,
      contentId: mongoose.Schema.Types.ObjectId, // Reference to FileCategory or Lecture
      order: Number,
      duration: Number, // in minutes
      isPreview: Boolean // Free preview content
    }]
  }],

  // Pricing and Business
  price: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  published: {
    type: Boolean,
    default: false
  },

  // Analytics
  enrollments: {
    type: Number,
    default: 0
  },
  rating: {
    average: Number,
    count: Number
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
});

// Add indexes for performance
Course.index({ published: 1, createdAt: -1 });
Course.index({ slug: 1 });
Course.index({ tags: 1 });
Course.index({ difficulty: 1 });
Course.index({ featured: 1 });
```

### Subscription Plan Model

```javascript
const SubscriptionPlan = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: String,

  // Pricing
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    default: 'monthly'
  },

  // Course Access Configuration
  includedCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    courseName: String, // For caching performance
    accessLevel: {
      type: String,
      enum: ['full', 'restricted', 'preview'],
      default: 'full'
    },
    restrictions: {
      maxEnrollments: Number,
      validDays: Number, // Days from subscription start
      limitedCategories: [String] // If access to specific categories only
    }
  }],

  // Features and Benefits
  features: {
    unlimitedLectures: Boolean,
    prioritySupport: Boolean,
    downloadableContent: Boolean,
    certificates: Boolean,
    lifetimeAccess: Boolean,
    communityAccess: Boolean
  },

  // Business Configuration
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: Boolean, // Mark as popular plan
  recommended: Boolean, // Recommended for certain user types

  // Target Audience
  targetOccupation: [String],
  skillLevel: [String],

  // Analytics
  subscriberCount: {
    type: Number,
    default: 0
  },

  // Razorpay Configuration
  razorpayPlanId: String, // For recurring subscriptions

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: Date,
  updatedAt: Date
});

SubscriptionPlan.index({ isActive: 1, createdAt: -1 });
SubscriptionPlan.index({ isPopular: 1 });
SubscriptionPlan.index({ slug: 1 });
```

### Enhanced User Model (Subscription Tracking)

```javascript
const User = new mongoose.Schema({
  // ... existing fields ...

  // Enhanced subscription tracking
  activeSubscription: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    },
    planName: String,
    subscriptionId: String, // Razorpay subscription ID
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending', 'paused'],
      default: 'active'
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },

  // Course enrollments and progress
  enrolledCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    courseName: String,
    enrolledDate: Date,
    completedDate: Date,
    progress: Number, // Percentage 0-100
    lastAccessed: Date,
    certificateEarned: Boolean,
    categoryProgress: [{
      categoryName: String,
      completedLectures: Number,
      totalLectures: Number,
      progress: Number
    }],
    quizScores: [{
      quizId: String,
      score: Number,
      completedAt: Date
    }]
  }],

  // Individual lecture progress (for unstructured learning)
  lectureProgress: [{
    lectureId: String,
    completed: Boolean,
    progress: Number,
    completedAt: Date
  }],

  // ... existing fields ...
});
```

## API Implementation

### Course Management APIs

```javascript
// Get all published courses
GET /api/courses

// Get course details with enrollment status
GET /api/courses/:slug

// Get user's enrolled courses
GET /api/user/courses

// Get course content (lectures by category)
GET /api/courses/:courseId/lectures

// Update course progress
PUT /api/user/progress/course/:courseId

// Get course progress
GET /api/user/progress/course/:courseId
```

### Subscription Plan APIs

```javascript
// Get available subscription plans
GET /api/subscription-plans

// Get plan details
GET /api/subscription-plans/:slug

// Create Razorpay subscription
POST /api/subscription-plans/:planId/subscribe

// Cancel subscription
DELETE /api/user/subscription

// Get subscription status
GET /api/user/subscription/status
```

### Admin APIs for Course Management

```javascript
// Create/Edit/Delete courses
POST /api/admin/courses
PUT /api/admin/courses/:id
DELETE /api/admin/courses/:id

// Manage course content
POST /api/admin/courses/:courseId/lectures
PUT /api/admin/courses/:courseId/lectures/:lectureId

// Create/Edit/Delete subscription plans
POST /api/admin/subscription-plans
PUT /api/admin/subscription-plans/:id
DELETE /api/admin/subscription-plans/:id

// Assign courses to subscription plans
PUT /api/admin/subscription-plans/:planId/courses
```

## Access Control System

### Course Access Middleware

```javascript
const courseAccessMiddleware = async (req, res, next) => {
  const { courseId } = req.params;
  const user = req.user;

  // Check if course exists and is published
  const course = await Course.findById(courseId);
  if (!course || !course.published) {
    return res.status(404).json({
      error: 'Course not found',
      message: 'The requested course is not available.'
    });
  }

  // Check if user has active subscription
  if (!user.activeSubscription ||
      user.activeSubscription.status !== 'active') {
    return res.status(403).json({
      error: 'Subscription required',
      message: 'A valid subscription is required to access this course.'
      redirect: '/subscription-plans'
    });
  }

  // Check if course is included in user's subscription plan
  const plan = await SubscriptionPlan.findById(user.activeSubscription.planId);
  const hasAccess = plan.includedCourses.some(
    included => included.courseId.toString() === courseId &&
    included.accessLevel === 'full'
  );

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your subscription plan does not include access to this course.'
    });
  }

  // Attach course and access information to request
  req.course = course;
  req.courseAccess = plan.includedCourses.find(
    c => c.courseId.toString() === courseId
  );

  next();
};
```

### Lecture Access Validation

```javascript
const lectureAccessMiddleware = async (req, res, next) => {
  const { courseId, lectureId } = req.params;
  const user = req.user;

  // Get course and find the lecture
  const course = req.course;
  let lecture;

  // Search through course categories for the lecture
  for (const category of course.categories) {
    lecture = category.lectures.find(l => l.slug === lectureId);
    if (lecture) {
      req.lectureCategory = category;
      break;
    }
  }

  if (!lecture) {
    return res.status(404).json({
      error: 'Lecture not found',
      message: 'The requested lecture does not exist in this course.'
    });
  }

  // Check access level for this lecture
  const courseAccess = req.courseAccess;

  if (lecture.isPreview || courseAccess.accessLevel === 'full') {
    req.lecture = lecture;
    next();
  } else if (courseAccess.accessLevel === 'preview') {
    // Show preview message
    return res.status(403).json({
      error: 'Preview only',
      message: 'This lecture is not included in your subscription plan.',
      upgradeRequired: true
    });
  } else {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your subscription does not include access to this lecture.'
    });
  }
};
```

## Frontend Implementation

### New Components

#### CourseList Component
```jsx
const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCourses();
  }, []);

  const fetchUserCourses = async () => {
    try {
      const [coursesRes, subRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/user/subscription/status')
      ]);

      setCourses(coursesRes.data);
      setSubscription(subRes.data.subscription);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseStatus = (course) => {
    const userCourse = subscription?.enrolledCourses.find(
      c => c.courseId === course._id
    );
    return {
      isEnrolled: !!userCourse,
      progress: userCourse?.progress || 0,
      hasAccess: subscription?.includedCourses.some(c => c.courseId === course._id)
    };
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Available Courses
      </Typography>

      {!subscription && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Subscribe to a plan to access premium courses
          <Link href="/subscription-plans"> View Plans</Link>
        </Alert>
      )}

      <Grid container spacing={3}>
        {courses.map(course => {
          const status = getCourseStatus(course);
          return (
            <Grid item xs={12} sm={6} md={4} key={course._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="180"
                  image={course.thumbnail || '/default-course.jpg'}
                  alt={course.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {course.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {course.shortDescription}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={course.difficulty}
                      size="small"
                      color={getDifficultyColor(course.difficulty)}
                    />
                    {course.featured && (
                      <Chip label="Featured" size="small" color="primary" />
                    )}
                  </Box>
                  {status.isEnrolled && (
                    <LinearProgress
                      variant="determinate"
                      value={status.progress}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {status.progress}% Complete
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  {status.hasAccess ? (
                    <Button
                      size="small"
                      variant={status.isEnrolled ? "contained" : "outlined"}
                      component={RouterLink}
                      to={`/course/${course.slug}`}
                      fullWidth
                    >
                      {status.isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      to="/subscription-plans"
                      fullWidth
                    >
                      Upgrade Required
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};
```

#### CourseDetail Component
```jsx
const CourseDetail = ({ courseSlug }) => {
  const [course, setCourse] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseSlug]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(`/api/courses/${courseSlug}`);
      setCourse(response.data.course);
      setUserProgress(response.data.progress);
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="lg">
      {/* Course Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {course.title}
        </Typography>
        <Typography variant="body1" paragraph>
          {course.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip label={course.difficulty} color={getDifficultyColor(course.difficulty)} />
          <Chip label={`${course.duration} minutes`} />
          <Chip label={`${course.enrollments} students enrolled`} />
        </Box>
        {userProgress && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Your Progress: {userProgress.progress}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={userProgress.progress}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        )}
      </Box>

      {/* Course Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {course.categories.map(category => (
            <Accordion key={category.name} expanded={true}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{category.name}</Typography>
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  {category.lectures.length} lectures
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {category.lectures.map(lecture => {
                    const lectureProgress = userProgress?.categoryProgress
                      .find(cp => cp.categoryName === category.name);

                    return (
                      <ListItem
                        key={lecture.slug}
                        button
                        component={RouterLink}
                        to={`/course/${course.slug}/lecture/${lecture.slug}`}
                      >
                        <ListItemIcon>
                          {lectureProgress?.completedLectures > lecture.order ? (
                            <CheckCircleIcon color="success" />
                          ) : lecture.order === lectureProgress?.completedLectures + 1 ? (
                            <PlayCircleIcon color="primary" />
                          ) : (
                            <LockIcon color="disabled" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={lecture.title}
                          secondary={`${lecture.duration} min`}
                        />
                        {lecture.isPreview && (
                          <Chip label="Preview" size="small" color="secondary" />
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>
      </Grid>
    </Container>
  );
};
```

#### SubscriptionPlans Component
```jsx
const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/subscription-plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      const response = await axios.post(`/api/subscription-plans/${planId}/subscribe`);
      // Redirect to Razorpay payment
      window.location.href = response.data.paymentUrl;
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Choose Your Learning Plan
      </Typography>
      <Typography variant="body1" align="center" sx={{ mb: 4 }}>
        Select the plan that best fits your learning needs
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        {plans.map(plan => (
          <Grid item xs={12} sm={6} md={4} key={plan._id}>
            <Card
              sx={{
                height: '100%',
                border: plan.isPopular ? '2px solid #1976d2' : 'none'
              }}
            >
              {plan.isPopular && (
                <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 1 }}>
                  <Typography variant="body2" align="center" fontWeight="bold">
                    MOST POPULAR
                  </Typography>
                </Box>
              )}
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="body1" paragraph color="text.secondary">
                  {plan.description}
                </Typography>
                <Box sx={{ my: 2 }}>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    ₹{plan.price}
                    <Typography variant="body2" component="span" color="text.secondary">
                      /{plan.billingCycle}
                    </Typography>
                  </Typography>
                </Box>

                {/* Plan Features */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Includes Access To:
                  </Typography>
                  {plan.includedCourses.map(course => (
                    <Box key={course.courseId} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <CheckIcon sx={{ mr: 1, color: 'success.main', fontSize: 18 }} />
                      <Typography variant="body2">{course.courseName}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Additional Features */}
                {plan.features && (
                  <Box sx={{ mb: 2 }}>
                    {plan.features.unlimitedLectures && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CheckIcon sx={{ mr: 1, color: 'success.main', fontSize: 18 }} />
                        <Typography variant="body2">Unlimited Lectures</Typography>
                      </Box>
                    )}
                    {plan.features.certificates && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CheckIcon sx={{ mr: 1, color: 'success.main', fontSize: 18 }} />
                        <Typography variant="body2">Completion Certificates</Typography>
                      </Box>
                    )}
                    {plan.features.prioritySupport && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CheckIcon sx={{ mr: 1, color: 'success.main', fontSize: 18 }} />
                        <Typography variant="body2">Priority Support</Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => handleSubscribe(plan._id)}
                  sx={{ fontWeight: 'bold' }}
                >
                  Subscribe Now
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
```

## Admin Dashboard Enhancements

### Course Management Interface
```jsx
const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Course CRUD operations
  const handleCreateCourse = async (courseData) => {
    const formData = new FormData();
    Object.keys(courseData).forEach(key => {
      formData.append(key, courseData[key]);
    });

    await axios.post('/api/admin/courses', formData);
    fetchCourses();
  };

  const handleUpdateCourse = async (courseId, courseData) => {
    await axios.put(`/api/admin/courses/${courseId}`, courseData);
    fetchCourses();
  };

  const handleDeleteCourse = async (courseId) => {
    await axios.delete(`/api/admin/courses/${courseId}`);
    fetchCourses();
  };

  // Add lecture to course
  const handleAddLecture = async (courseId, lectureData) => {
    await axios.post(`/api/admin/courses/${courseId}/lectures`, lectureData);
    // Refresh course data
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Course Management</Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Create New Course
        </Button>
      </Box>

      <DataGrid
        rows={courses}
        columns={[
          { field: 'title', headerName: 'Title', width: 200 },
          { field: 'difficulty', headerName: 'Level', width: 100 },
          { field: 'enrollments', headerName: 'Students', width: 100 },
          { field: 'published', headerName: 'Published', width: 100 },
          { field: 'createdAt', headerName: 'Created', width: 120 },
          {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
              <Box>
                <IconButton onClick={() => handleEdit(params.row)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(params.row._id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            )
          }
        ]}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
      />

      {/* Create/Edit Course Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCourse ? 'Edit Course' : 'Create New Course'}
        </DialogTitle>
        <DialogContent>
          <CourseForm
            course={selectedCourse}
            onSubmit={selectedCourse ? handleUpdateCourse : handleCreateCourse}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
```

### Subscription Plan Management Interface
```jsx
const SubscriptionPlanManagement = () => {
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCourses();
  }, []);

  const fetchPlans = async () => {
    const response = await axios.get('/api/admin/subscription-plans');
    setPlans(response.data);
  };

  const fetchCourses = async () => {
    const response = await axios.get('/api/admin/courses');
    setCourses(response.data);
  };

  const handleCreatePlan = async (planData) => {
    await axios.post('/api/admin/subscription-plans', planData);
    fetchPlans();
  };

  const handleUpdatePlan = async (planId, planData) => {
    await axios.put(`/api/admin/subscription-plans/${planId}`, planData);
    fetchPlans();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Subscription Plan Management</Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Create New Plan
        </Button>
      </Box>

      <Grid container spacing={3}>
        {plans.map(plan => (
          <Grid item xs={12} md={6} lg={4} key={plan._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {plan.description}
                </Typography>
                <Typography variant="h5" component="div">
                  ₹{plan.price}/{plan.billingCycle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {plan.subscriberCount} subscribers
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Included Courses:
                  </Typography>
                  {plan.includedCourses.map(course => (
                    <Chip
                      key={course.courseId}
                      label={course.courseName}
                      size="small"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => {
                  setSelectedPlan(plan);
                  setOpenDialog(true);
                }}>
                  Edit
                </Button>
                <Button size="small" color="error">
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
        </DialogTitle>
        <DialogContent>
          <SubscriptionPlanForm
            plan={selectedPlan}
            courses={courses}
            onSubmit={selectedPlan ? handleUpdatePlan : handleCreatePlan}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
```

## Implementation Phases

### Phase 1: Backend Infrastructure (Week 1-2)
1. Create Course and SubscriptionPlan models
2. Update User model for course subscriptions
3. Implement basic CRUD operations for courses and plans
4. Set up Razorpay integration for subscription payments

### Phase 2: Access Control System (Week 3)
1. Implement course access middleware
2. Build lecture access validation
3. Create subscription verification system
4. Test access control scenarios

### Phase 3: Frontend Development (Week 4-5)
1. Build CourseList and CourseDetail components
2. Create SubscriptionPlans component with Razorpay integration
3. Implement progress tracking UI
4. Design responsive course viewing interface

### Phase 4: Admin Dashboard (Week 6)
1. Course management interface
2. Subscription plan configuration
3. Analytics and reporting for courses
4. User enrollment management

### Phase 5: Testing and Optimization (Week 7)
1. Comprehensive testing of access control
2. Performance optimization for course loading
3. Mobile responsiveness improvements
4. Final integration testing

## Benefits of This Implementation

1. **Structured Learning**: Users can follow complete learning paths
2. **Personalized Experience**: Target specific learning needs and goals
3. **Scalable Revenue Model**: Flexible subscription tiers with varied pricing
4. **Better Content Organization**: Categorize and structure content effectively
5. **Progress Tracking**: Detailed analytics on user engagement and completion
6. **Admin Control**: Easy content management and subscription configuration
7. **User Engagement**: Clear learning objectives and milestones

This course-based subscription system transforms your platform into a comprehensive e-learning solution with structured learning paths and flexible monetization options.
