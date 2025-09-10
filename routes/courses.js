const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const auth = require('../middleware/auth');
const subscription = require('../middleware/subscription');
const { body, param, validationResult } = require('express-validator');

// Validation rules
const courseValidation = [
  body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('slug').matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description').isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('difficulty').isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']).withMessage('Invalid difficulty level'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute')
];

// Apply authentication to all routes
router.use(auth);

// =============================
// PUBLIC/USER ROUTES
// =============================

// Get all published courses with enrolled status
router.get('/', async (req, res) => {
  try {
    let courses = [];

    if (req.user) {
      // Get courses with enrollment status for authenticated users
      const user = await User.findById(req.user._id).select('enrolledCourses subscription').lean();

      courses = await Course.find({ published: true })
        .select('title slug description shortDescription difficulty duration thumbnail enrollments rating featured instructor')
        .populate('categories', 'name estimatedDuration')
        .sort({ featured: -1, enrollments: -1, createdAt: -1 })
        .lean();

      // Add enrollment status and access info
     let userPlan = null;
     if (user.subscription && user.subscription.status === 'completed' && user.subscription.planId) {
       try {
         const SubscriptionPlan = require('../models/SubscriptionPlan');
         userPlan = await SubscriptionPlan.findById(user.subscription.planId)
           .select('_id name includedCourses')
           .lean();
         console.log(`🎓 COURSES - Loaded plan for user: ${userPlan?.name} with ${userPlan?.includedCourses?.length || 0} courses`);
       } catch (error) {
         console.error('Error loading user plan for access check:', error);
         userPlan = null;
       }
     }

     courses = courses.map(course => {
       const enrolledCourse = user.enrolledCourses?.find(
         ec => ec.courseId.toString() === course._id.toString()
       );

       let hasAccess = false;
       if (userPlan && userPlan.includedCourses) {
         hasAccess = userPlan.includedCourses.some(planCourse =>
           planCourse.courseId.toString() === course._id.toString()
         );
         console.log(`✅ Course "${course.title}" access: ${hasAccess ? 'GRANTED' : 'DENIED'} in plan "${userPlan.name}"`);
       } else if (user.subscription && user.subscription.status === 'completed') {
         // Fallback for legacy subscriptions or plan fetch errors
         hasAccess = true;
         console.log(`⚠️ Legacy access granted for "${course.title}" - could not verify plan details`);
       }

       return {
         ...course,
         isEnrolled: !!enrolledCourse,
         progress: enrolledCourse?.progress || 0,
         lastAccessed: enrolledCourse?.lastAccessed,
         hasAccess: hasAccess,
         enrollmentsVisible: true,
         planName: userPlan?.name
       };
     });
    } else {
      // Get courses for unauthenticated users
      courses = await Course.find({ published: true })
        .select('title slug description shortDescription difficulty duration thumbnail featured instructor')
        .sort({ featured: -1, enrollments: -1, createdAt: -1 })
        .lean();

      courses = courses.map(course => ({
        ...course,
        isPreview: true,
        hasAccess: false,
        enrollmentsVisible: false
      }));
    }

    res.json({
      courses,
      total: courses.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      error: 'Failed to fetch courses',
      message: 'An error occurred while retrieving courses. Please try again later.'
    });
  }
});

// Get course details by slug
router.get('/:slug',
  param('slug').matches(/^[a-z0-9-]+$/).withMessage('Invalid course slug'),
  async (req, res) => {
  try {
    const { slug } = req.params;
    const { includeProgress = true } = req.query;

    // Get course
    const course = await Course.findOne({ slug, published: true })
      .populate({
        path: 'categories.lectures.contentId',
        model: 'FileCategory',
        select: 'filename title'
      })
      .lean();

    if (!course) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course does not exist or is not available.'
      });
    }

    // Prepare course data
    let courseData = {
      ...course,
      url: `https://yourdomain.com/course/${course.slug}`,
      totalLectures: course.categories?.reduce((total, category) =>
        total + (category.lectures?.length || 0), 0
      ) || 0,
      totalDuration: course.categories?.reduce((total, category) =>
        total + (category.estimatedDuration || 0), 0
      ) || 0
    };

    // Final summary
    console.log('🎯 COURSE API RESPONSE SUMMARY:');
    console.log(`   Title: ${courseData.title}`);
    console.log(`   Total Categories: ${courseData.categories?.length || 0}`);
    console.log(`   Total Lectures: ${courseData.totalLectures}`);
    console.log(`   Total Duration: ${courseData.totalDuration} minutes`);
    console.log('✅ Course data prepared for frontend');

    // Debug lecture fetching
    console.log('🔍 FETCH COURSE DEBUG - LECTURE STRUCTURE:');
    console.log(`   Course: ${course.title} (${course._id})`);
    console.log(`   Categories found: ${course.categories?.length || 0}`);

    if (course.categories && course.categories.length > 0) {
      course.categories.forEach((category, catIndex) => {
        console.log(`   Category ${catIndex + 1}: "${category.name}" (${category._id})`);
        console.log(`   Lectures in category: ${category.lectures?.length || 0}`);

        category.lectures?.forEach((lecture, lecIndex) => {
          console.log(`     Lecture ${lecIndex + 1}: "${lecture.title}" (${lecture._id})`);
          console.log(`     Has Content ID: ${!!lecture.contentId}`);
          if (lecture.contentId) {
            console.log(`     Content ID: ${lecture.contentId}`);
          }
        });
      });
    } else {
      console.log('   ⚠️ NO CATEGORIES FOUND - Need to trigger auto-linking for this course');
    }

    // Add user progress if authenticated
    if (req.user && includeProgress !== 'false') {
      const user = await User.findById(req.user._id).select('enrolledCourses').lean();

      const enrolledCourse = user.enrolledCourses?.find(
        ec => ec.courseId.toString() === course._id.toString()
      );

      if (enrolledCourse) {
        courseData.userProgress = {
          enrolledDate: enrolledCourse.enrolledDate,
          progress: enrolledCourse.progress,
          lastAccessed: enrolledCourse.lastAccessed,
          completedDate: enrolledCourse.completedDate,
          certificateEarned: enrolledCourse.certificateEarned,
          categoryProgress: enrolledCourse.categoryProgress
        };
      }
    }

    // Check access permissions
    let accessStatus = 'preview';
    if (req.user) {
      const user = await User.findById(req.user._id).select('subscription').lean();

      if (user.subscription && user.subscription.status === 'completed') {
        // In a real implementation, check specific plan access
        accessStatus = 'full';
      }
    }

    courseData.access = {
      isSubscribed: accessStatus === 'full',
      accessLevel: accessStatus,
      canEnroll: !req.user ? false : accessStatus === 'full',
      restrictions: accessStatus === 'preview' ? ['Limited content access'] : []
    };

    res.json({
      course: courseData,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      error: 'Failed to fetch course',
      message: 'An error occurred while retrieving the course. Please try again later.'
    });
  }
});

// Enroll user in a course
router.post('/:courseId/enroll',
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  subscription, // Check active subscription
  async (req, res) => {
  try {
    console.log('🔥 SERVER ENROLLMENT REQUEST RECEIVED');
    console.log('   🎯 Request Params:', req.params);
    console.log('   👤 User ID:', req.user._id);
    console.log('   📚 Course ID:', req.params.courseId);
    console.log('   🔑 User Authentication:', req.user ? 'VALID' : 'INVALID');
    console.log('   📝 Headers:', req.headers['authorization'] ? 'TOKEN PRESENT' : 'NO TOKEN');

    const { courseId } = req.params;
    const userId = req.user._id;

    console.log('🔍 VALIDATION CHECKS STARTED');

    // 🎯 VALIDATION STEP 1: Check course ID format
    if (courseId.toString() !== courseId) {
      console.log('❌ COURSE ID FORMAT INVALID - Expected MongoDB ObjectId');
      return res.status(400).json({
        error: 'Invalid course ID format',
        message: 'Course ID must be a valid MongoDB ObjectId.'
      });
    }

    // 🎯 VALIDATION STEP 2: Check course exists
    console.log('🔍 PHASE 2: Checking if course exists...');
    try {
      const courseCheck = await Course.findById(courseId);
      console.log('📚 COURSE LOOKUP RESULT:', courseCheck ? 'EXISTS' : 'NOT FOUND');
      if (!courseCheck) {
        console.log('❌ COURSE NOT FOUND in database');
        return res.status(404).json({
          error: 'Course not found',
          message: 'The requested course does not exist.'
        });
      }
      console.log('✅ COURSE DETAILS:', { title: courseCheck.title, published: courseCheck.published });
    } catch (courseLookupError) {
      console.error('💥 COURSE LOOKUP ERROR:', courseLookupError.message);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to retrieve course from database.'
      });
    }

    // 🎯 VALIDATION STEP 3: Check user already enrolled
    console.log('🔍 PHASE 3: Checking existing enrollment and subscription access...');
    try {
      const userCheck = await User.findById(userId).select('enrolledCourses subscription');
      console.log('👤 USER LOOKUP:', userCheck ? 'SUCCESS' : 'FAILED');

      if (!userCheck) {
        console.log('❌ USER NOT FOUND');
        return res.status(404).json({
          error: 'User not found',
          message: 'Your account could not be found.'
        });
      }

      const alreadyEnrolledCheck = userCheck.enrolledCourses.some(
        ec => ec.courseId.toString() === courseId
      );
      console.log('📝 EXISTING ENROLLMENT:', alreadyEnrolledCheck ? 'YES' : 'NO');

      if (alreadyEnrolledCheck) {
        console.log('⚠️  USER ALREADY ENROLLED - Rejecting duplicate enrollment');
        return res.status(400).json({
          error: 'Already enrolled',
          message: 'You are already enrolled in this course.'
        });
      }
    } catch (userLookupError) {
      console.error('💥 USER LOOKUP/ENROLLMENT CHECK ERROR:', userLookupError.message);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to check your enrollment status.'
      });
    }

    // 🎯 VALIDATION STEP 4: Get course for enrollment
    console.log('🔍 PHASE 4: Getting course for enrollment...');
    const course = await Course.findById(courseId);
    if (!course || !course.published) {
      console.log('❌ COURSE NOT AVAILABLE FOR ENROLLMENT');
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course is not available for enrollment.'
      });
    }

    console.log(`🏫 ENROLLMENT PROCESS STARTED:`);
    console.log(`   Course ID: ${courseId}`);
    console.log(`   Course Title: ${course.title}`);
    console.log(`   Course Published: ${course.published}`);

    // Enroll user using course method
    try {
      const enrollmentResult = await course.enrollUser(userId);
      console.log(`✅ ENROLLMENT METHOD COMPLETED:`);
      console.log(`   Enrollment Date: ${enrollmentResult.enrolledDate}`);
      console.log(`   Total Category Progress: ${enrollmentResult.categoryProgress.length}`);

      res.json({
        message: 'Successfully enrolled in course',
        enrollment: {
          courseId: course._id,
          enrolledDate: enrollmentResult.enrolledDate,
          courseName: course.title,
          courseSlug: course.slug,
          totalLectures: enrollmentResult.categoryProgress?.reduce(
            (total, category) => total + (category.totalLectures || 0), 0
          ) || 0
        },
        timestamp: new Date()
      });
    } catch (enrollmentError) {
      console.error('💥 ENROLLMENT METHOD FAILED:', enrollmentError.message);
      console.error('Full enrollment error:', enrollmentError);
      return res.status(500).json({
        error: 'Enrollment failed',
        message: enrollmentError.message || 'Failed to enroll in the course. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? {
          error: enrollmentError.message,
          stack: enrollmentError.stack
        } : undefined
      });
    }

  } catch (error) {
    console.error('💥 OUTER CATCH: Error enrolling in course:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Enrollment failed',
      message: 'Failed to enroll in the course. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack?.substring(0, 500) // Limit stack trace length
      } : undefined
    });
  }
});

// Get user's enrolled courses with progress
router.get('/user/enrolled', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses.courseId', 'title slug description difficulty thumbnail duration')
      .select('enrolledCourses')
      .lean();

    const enrolledCourses = user.enrolledCourses.map(enrollment => ({
      course: enrollment.courseId,
      enrolledDate: enrollment.enrolledDate,
      progress: enrollment.progress,
      lastAccessed: enrollment.lastAccessed,
      completedDate: enrollment.completedDate,
      certificateEarned: enrollment.certificateEarned,
      categoryProgress: enrollment.categoryProgress
    }));

    // Sort by enrollment date (newest first)
    enrolledCourses.sort((a, b) => new Date(b.enrolledDate) - new Date(a.enrolledDate));

    res.json({
      enrolledCourses,
      total: enrolledCourses.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({
      error: 'Failed to fetch enrolled courses',
      message: 'An error occurred while retrieving your enrolled courses.'
    });
  }
});

// Update course progress
router.put('/:courseId/progress',
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
  async (req, res) => {
  try {
    const { courseId } = req.params;
    const { progress, categoryProgress, lastAccessedLecture } = req.body;
    const userId = req.user._id;

    const updateData = {
      progress: Math.min(progress, 100),
      lastAccessed: new Date()
    };

    if (categoryProgress) updateData.categoryProgress = categoryProgress;
    if (lastAccessedLecture) updateData.lastAccessedLecture = lastAccessedLecture;

    // Handle completion
    if (progress >= 100) {
      updateData.completedDate = new Date();
      updateData.certificateEarned = true;
    }

    const result = await User.updateOne(
      {
        _id: userId,
        'enrolledCourses.courseId': courseId
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'Enrollment not found',
        message: 'You are not enrolled in this course.'
      });
    }

    res.json({
      message: 'Progress updated successfully',
      progress: updateData.progress,
      completed: progress >= 100,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      error: 'Progress update failed',
      message: 'Failed to update course progress.'
    });
  }
});

// =============================
// ADMIN ROUTES
// =============================

// Get all courses for admin (paginated)
router.get('/admin/courses', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status !== 'all') {
      if (status === 'published') query.published = true;
      else if (status === 'draft') query.published = false;
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { instructor: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await Course.find(query)
      .select('title slug published difficulty enrollments createdAt updatedAt featured instructor tags prerequisites learningObjectives description duration')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching admin courses:', error);
    res.status(500).json({
      error: 'Failed to fetch courses',
      message: 'An error occurred while retrieving courses.'
    });
  }
});

// Create new course (admin)
router.post('/admin/courses', courseValidation, async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors.array()
      });
    }

    // Check if slug already exists before creating
    const existingCourse = await Course.findOne({ slug: req.body.slug });
    if (existingCourse) {
      console.error('Duplicate slug validation - existing course found:', existingCourse.slug);
      return res.status(409).json({
        error: 'Duplicate course',
        message: `A course with slug "${req.body.slug}" already exists. Please use a different slug.`,
        existingCourse: {
          id: existingCourse._id,
          title: existingCourse.title,
          slug: existingCourse.slug
        }
      });
    }

    const courseData = {
      ...req.body,
      createdBy: req.user._id
    };

    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      message: 'Course created successfully',
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        published: course.published,
        createdAt: course.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating course:', error);
    if (error.code === 11000) { // MongoDB duplicate key error
      console.error('MongoDB duplicate key error for slug:', req.body.slug);
      return res.status(409).json({
        error: 'Duplicate course',
        message: 'This slug is already in use by another course.'
      });
    }
    res.status(500).json({
      error: 'Course creation failed',
      message: 'Failed to create the course. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get course for editing (admin)
router.get('/admin/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course does not exist.'
      });
    }

    res.json({
      course,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching course for editing:', error);
    res.status(500).json({
      error: 'Failed to fetch course',
      message: 'An error occurred while retrieving the course.'
    });
  }
});

// Update course (admin)
router.put('/admin/courses/:courseId', courseValidation, async (req, res) => {
  try {
    const { courseId } = req.params;

    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors.array()
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    const course = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course does not exist.'
      });
    }

    res.json({
      message: 'Course updated successfully',
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        published: course.published,
        updatedAt: course.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating course:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate course',
        message: 'A course with this slug already exists.'
      });
    }
    res.status(500).json({
      error: 'Course update failed',
      message: 'Failed to update the course. Please try again.'
    });
  }
});

// Delete course (admin)
router.delete('/admin/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course does not exist.'
      });
    }

    // Soft delete or archive instead of hard delete
    await Course.findByIdAndUpdate(courseId, {
      status: 'archived',
      published: false,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    // In a real implementation, you might want to:
    // - Remove from user enrollments
    // - Update subscription plans
    // - Clean up related data

    res.json({
      message: 'Course archived successfully',
      course: {
        _id: courseId,
        status: 'archived'
      }
    });

  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      error: 'Course deletion failed',
      message: 'Failed to delete the course. Please try again.'
    });
  }
});

// Publish/Unpublish course
router.patch('/admin/courses/:courseId/publish', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { published } = req.body;

    const course = await Course.findByIdAndUpdate(
      courseId,
      {
        published: published,
        publishDate: published ? new Date() : null,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course does not exist.'
      });
    }

    res.json({
      message: `Course ${published ? 'published' : 'unpublished'} successfully`,
      course: {
        _id: course._id,
        title: course.title,
        published: course.published,
        publishDate: course.publishDate
      }
    });

  } catch (error) {
    console.error('Error toggling course publish status:', error);
    res.status(500).json({
      error: 'Publish status update failed',
      message: 'Failed to change course publish status.'
    });
  }
});

// Get course analytics (admin)
router.get('/admin/courses/:courseId/analytics', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: 'Course not found',
        message: 'The requested course does not exist.'
      });
    }

    // Get enrollment details
    const users = await User.find({
      'enrolledCourses.courseId': courseId
    }).select('name email enrolledCourses').lean();

    const enrollments = users.map(user => {
      const enrolledCourse = user.enrolledCourses.find(
        ec => ec.courseId.toString() === courseId
      );
      return {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        enrolledDate: enrolledCourse.enrolledDate,
        progress: enrolledCourse.progress,
        lastAccessed: enrolledCourse.lastAccessed,
        completedDate: enrolledCourse.completedDate
      };
    });

    const analytics = {
      courseId: courseId,
      courseTitle: course.title,
      totalEnrollments: course.enrollments,
      enrollmentTrend: enrollments.sort((a, b) => new Date(b.enrolledDate) - new Date(a.enrolledDate)),
      averageProgress: enrollments.length > 0 ?
        enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length : 0,
      completionRate: enrollments.length > 0 ?
        (enrollments.filter(e => e.completedDate).length / enrollments.length) * 100 : 0,
      recentEnrollments: enrollments.slice(0, 10),
      createdAt: course.createdAt
    };

    res.json({
      analytics,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({
      error: 'Analytics fetch failed',
      message: 'Failed to retrieve course analytics.'
    });
  }
});

module.exports = router;
