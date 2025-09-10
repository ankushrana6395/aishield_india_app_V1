const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Get all subscription plans (public route)
router.get('/plans', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status === 'published') {
      filter.published = true;
    } else if (req.query.status === 'draft') {
      filter.published = false;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    if (req.query.sortBy) {
      sortOptions[req.query.sortBy] = req.query.sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.order = 1;
      sortOptions.createdAt = -1;
    }

    const plans = await SubscriptionPlan.find(filter)
      .populate({
        path: 'includedCourses.courseId',
        select: 'title instructor difficulty duration',
        transform: (doc) => {
          // ✅ ROBUST FIX: Handle null/undefined courses safely
          console.log('🔍 POPULATE DEBUG: transform called with doc:', typeof doc, doc);
          if (!doc) {
            console.log('⚠️ POPULATE: doc is null/undefined');
            return null;
          }
          if (typeof doc !== 'object') {
            console.log('⚠️ POPULATE: doc is not an object:', typeof doc);
            return null;
          }
          if (!doc._id) {
            console.log('⚠️ POPULATE: doc has no _id:', doc);
            return null;
          }

          try {
            return {
              _id: doc._id.toString ? doc._id.toString() : doc._id,
              title: doc.title || 'Course No Longer Available',
              instructor: doc.instructor || 'N/A',
              difficulty: doc.difficulty || 'Unknown',
              duration: doc.duration || 0
            };
          } catch (referenceError) {
            console.log('⚠️ POPULATE: Error in transform:', referenceError.message);
            return null;
          }
        }
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get subscriber counts for each plan
    const plansWithCounts = plans.map(plan => ({
      ...plan,
      subscribersCount: plan.subscribers?.length || 0
    }));

    const total = await SubscriptionPlan.countDocuments(filter);

    res.json({
      plans: plansWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single subscription plan
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id)
      .populate({
        path: 'includedCourses.courseId',
        select: 'title description instructor difficulty duration slug',
        transform: (doc) => {
          if (!doc || !doc._id) {
            return null;
          }
          return {
            _id: doc._id.toString(),
            title: doc.title || 'Course No Longer Available',
            description: doc.description || 'This course has been removed',
            instructor: doc.instructor || 'N/A',
            difficulty: doc.difficulty || 'Unknown',
            duration: doc.duration || 0,
            slug: doc.slug || 'unknown-course'
          };
        }
      });

    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // ✅ CRITICAL FIX: Format plan for frontend editing
    const formattedPlan = plan.toObject();
    console.log('🔍 GET PLAN DEBUG: Raw plan data:', JSON.stringify(formattedPlan, null, 2));

    if (formattedPlan.includedCourses && formattedPlan.includedCourses.length > 0) {
      // Remove duplicates and ensure proper formatting for frontend
      const uniqueCourses = [];
      const courseIds = new Set();

      formattedPlan.includedCourses.forEach(courseAccess => {
        if (courseAccess && courseAccess.courseId && !courseIds.has(courseAccess.courseId._id)) {
          courseIds.add(courseAccess.courseId._id);
          uniqueCourses.push({
            courseId: courseAccess.courseId,
            courseName: courseAccess.courseId.title,
            courseSlug: courseAccess.courseId.slug || 'unknown-course',
            accessLevel: courseAccess.accessLevel || 'full'
          });
        }
      });

      // Replace with deduplicated and properly formatted courses
      formattedPlan.includedCourses = uniqueCourses;
    }

    // Also format for the coursesIncluded array that frontend might need
    if (formattedPlan.includedCourses && formattedPlan.includedCourses.length > 0) {
      formattedPlan.coursesIncluded = formattedPlan.includedCourses.map(courseAccess =>
        courseAccess.courseId._id.toString()
      );
    } else {
      formattedPlan.coursesIncluded = [];
    }

    // ✅ CRITICAL FIX: Map features back to frontend format
    console.log('🔍 GET PLAN DEBUG: Raw plan data from DB:', {
      name: formattedPlan.name,
      features: formattedPlan.features,
      business: formattedPlan.business
    });

    // Map nested features structure back to flat fields for frontend
    if (formattedPlan.features) {
      console.log('🔍 GET PLAN DEBUG: Features object exists:', JSON.stringify(formattedPlan.features, null, 2));

      // Map support level from priority support
      if (formattedPlan.features.prioritySupport === true) {
        formattedPlan.supportLevel = 'premium';
      } else if (formattedPlan.features.prioritySupport === false) {
        formattedPlan.supportLevel = 'basic';
      } else {
        formattedPlan.supportLevel = 'basic';
      }

      // Map certificate, quiz, download settings - use explicit boolean conversion
      formattedPlan.certificateEnabled = formattedPlan.features.certificates === true;
      formattedPlan.quizEnabled = formattedPlan.features.quizEnabled === true;
      formattedPlan.downloadEnabled = formattedPlan.features.downloadableContent === true;

      console.log('🔍 GET PLAN DEBUG: Raw features values:', {
        prioritySupport: formattedPlan.features.prioritySupport,
        certificates: formattedPlan.features.certificates,
        quizEnabled: formattedPlan.features.quizEnabled,
        downloadableContent: formattedPlan.features.downloadableContent
      });

      console.log('🔍 GET PLAN DEBUG: Mapped values:', {
        supportLevel: formattedPlan.supportLevel,
        certificateEnabled: formattedPlan.certificateEnabled,
        quizEnabled: formattedPlan.quizEnabled,
        downloadEnabled: formattedPlan.downloadEnabled
      });
    } else {
      console.log('⚠️ GET PLAN DEBUG: No features object found in plan');
      formattedPlan.supportLevel = 'basic';
      formattedPlan.certificateEnabled = false;
      formattedPlan.quizEnabled = false;
      formattedPlan.downloadEnabled = false;
    }

    // Handle business fields
    if (formattedPlan.business && formattedPlan.business.isPopular !== undefined) {
      formattedPlan.popular = !!formattedPlan.business.isPopular;
      console.log('🔍 GET PLAN DEBUG: Mapped popular:', formattedPlan.popular);
    } else {
      formattedPlan.popular = false;
    }

    console.log('🔍 GET PLAN DEBUG: Final formatted plan:', JSON.stringify(formattedPlan, null, 2));

    res.json(formattedPlan);
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes - require authentication and admin role

// Get single subscription plan for admin (CRITICAL FIX - adding this missing route)
router.get('/admin/plans/:id', auth, requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id)
      .populate({
        path: 'includedCourses.courseId',
        select: 'title description instructor difficulty duration slug',
        transform: (doc) => {
          if (!doc || !doc._id) {
            return null;
          }
          return {
            _id: doc._id.toString(),
            title: doc.title || 'Course No Longer Available',
            description: doc.description || 'This course has been removed',
            instructor: doc.instructor || 'N/A',
            difficulty: doc.difficulty || 'Unknown',
            duration: doc.duration || 0,
            slug: doc.slug || 'unknown-course'
          };
        }
      });

    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // ✅ CRITICAL FIX: Format plan for frontend editing
    const formattedPlan = plan.toObject();
    console.log('🔍 ADMIN GET PLAN DEBUG: Raw plan data:', JSON.stringify(formattedPlan, null, 2));

    if (formattedPlan.includedCourses && formattedPlan.includedCourses.length > 0) {
      // Remove duplicates and ensure proper formatting for frontend
      const uniqueCourses = [];
      const courseIds = new Set();

      formattedPlan.includedCourses.forEach(courseAccess => {
        if (courseAccess && courseAccess.courseId && !courseIds.has(courseAccess.courseId._id)) {
          courseIds.add(courseAccess.courseId._id);
          uniqueCourses.push({
            courseId: courseAccess.courseId,
            courseName: courseAccess.courseId.title,
            courseSlug: courseAccess.courseId.slug || 'unknown-course',
            accessLevel: courseAccess.accessLevel || 'full'
          });
        }
      });

      // Replace with deduplicated and properly formatted courses
      formattedPlan.includedCourses = uniqueCourses;
    }

    // Also format for the coursesIncluded array that frontend might need
    if (formattedPlan.includedCourses && formattedPlan.includedCourses.length > 0) {
      formattedPlan.coursesIncluded = formattedPlan.includedCourses.map(courseAccess =>
        courseAccess.courseId._id.toString()
      );
    } else {
      formattedPlan.coursesIncluded = [];
    }

    // ✅ CRITICAL FIX: Map features back to frontend format for admin editing
    if (formattedPlan.features) {
      console.log('🔍 ADMIN GET PLAN DEBUG: Features object exists:', JSON.stringify(formattedPlan.features, null, 2));

      // Map support level from priority support
      if (formattedPlan.features.prioritySupport === true) {
        formattedPlan.supportLevel = 'premium';
      } else if (formattedPlan.features.prioritySupport === false) {
        formattedPlan.supportLevel = 'basic';
      } else {
        formattedPlan.supportLevel = 'basic';
      }

      // Map certificate, quiz, download settings
      formattedPlan.certificateEnabled = formattedPlan.features.certificates === true;
      formattedPlan.quizEnabled = formattedPlan.features.quizEnabled === true;
      formattedPlan.downloadEnabled = formattedPlan.features.downloadableContent === true;

    } else {
      console.log('⚠️ ADMIN GET PLAN DEBUG: No features object found in plan');
      formattedPlan.supportLevel = 'basic';
      formattedPlan.certificateEnabled = false;
      formattedPlan.quizEnabled = false;
      formattedPlan.downloadEnabled = false;
    }

    // Handle business fields for admin editing
    if (formattedPlan.business && formattedPlan.business.isPopular !== undefined) {
      formattedPlan.popular = !!formattedPlan.business.isPopular;
    } else {
      formattedPlan.popular = false;
    }

    console.log('🔍 ADMIN GET PLAN DEBUG: Final formatted plan for admin editing:', JSON.stringify(formattedPlan, null, 2));

    res.json(formattedPlan);
  } catch (error) {
    console.error('Error fetching subscription plan for admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all subscription plans for admin
router.get('/admin/plans', auth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status === 'published') {
      filter.published = true;
    } else if (req.query.status === 'draft') {
      filter.published = false;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { slug: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    console.log('🔍 DEBUG: Fetching admin plans with filter:', filter);
    console.log('🔍 DEBUG: Query parameters:', {
      page, limit, search: req.query.search, status: req.query.status
    });

    // Let's see all plans first before filtering
    const allPlansCount = await SubscriptionPlan.countDocuments();
    console.log('🔍 DEBUG: Total plans in database (before filter):', allPlansCount);

    const plans = await SubscriptionPlan.find(filter)
      .populate({
        path: 'includedCourses.courseId',
        select: 'title instructor difficulty duration slug _id',
        transform: (doc) => {
          console.log('🔍 DEBUG: Populate transform called for course:', doc?._id);
          // ✅ FIX: Handle null/undefined courses
          if (!doc || !doc._id) {
            console.log('⚠️ DEBUG: Course is null/undefined, returning defaults');
            return {
              _id: null,
              title: 'Course No Longer Available',
              instructor: 'N/A',
              difficulty: 'Unknown',
              duration: 0,
              slug: 'unknown-course'
            };
          }

          console.log('✅ DEBUG: Course populated:', doc._id, doc.title);
          return {
            _id: doc._id.toString(),
            title: doc.title,
            instructor: doc.instructor,
            difficulty: doc.difficulty,
            duration: doc.duration,
            slug: doc.slug
          };
        }
      })
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('🔍 DEBUG: Found plans count:', plans.length);
    console.log('🔍 DEBUG: Plans details:');
    plans.forEach((plan, index) => {
      console.log(`  ${index + 1}. ID: ${plan._id} | Name: ${plan.name} | Published: ${plan.published} | Created: ${plan.createdAt}`);
    });

    // Add populated data to response
    const populatedPlans = plans.map(plan => {
      const planObj = plan.toObject();
      console.log('🔍 DEBUG: Plan courses:', planObj.includedCourses?.length || 0);
      if (planObj.includedCourses) {
        planObj.includedCourses.forEach((course, idx) => {
          console.log(`🔍 DEBUG: Course ${idx}:`, course.courseId?.title || 'NO TITLE');
        });
      }
      return planObj;
    });

    // Get subscriber counts for each populated plan and derive published status
    const plansWithCounts = populatedPlans.map(plan => ({
      ...plan,
      published: plan.business?.isActive && plan.business?.isVisible || false,
      subscribersCount: plan.subscribers?.length || 0
    }));

    const total = await SubscriptionPlan.countDocuments(filter);

    res.json({
      plans: plansWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plans for admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new subscription plan (admin only)
router.post('/admin/plans', auth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      monthlyPrice,
      yearlyPrice,
      features,
      coursesIncluded,
      maxCourses,
      supportLevel,
      certificateEnabled,
      quizEnabled,
      downloadEnabled,
      duration,
      popular,
      order,
      published
    } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ message: 'Plan name and slug are required' });
    }

    if (!monthlyPrice) {
      return res.status(400).json({ message: 'Plan price is required' });
    }

    if (!coursesIncluded || coursesIncluded.length === 0) {
      return res.status(400).json({ message: 'At least one course must be included' });
    }

    // Verify courses exist and get full course data
    const courses = await Course.find({
      _id: { $in: coursesIncluded }
    }).select('title slug');

    if (courses.length !== coursesIncluded.length) {
      return res.status(400).json({ message: 'One or more selected courses do not exist' });
    }

    // Check for duplicate slug
    const existingPlan = await SubscriptionPlan.findOne({ slug });
    if (existingPlan) {
      return res.status(400).json({ message: 'A plan with this slug already exists' });
    }

    // Transform course IDs to embedded CourseAccess objects
    const includedCourses = coursesIncluded.map(courseId => {
      const course = courses.find(c => c._id.toString() === courseId);
      return {
        courseId: courseId,
        courseName: course.title,
        courseSlug: course.slug,
        accessLevel: 'full'
      };
    });

    const newPlan = new SubscriptionPlan({
      name,
      slug,
      description,
      published: published ?? true, // Default to published: true
      pricing: {
        currency: 'INR',
        price: parseFloat(monthlyPrice),
        originalPrice: yearlyPrice ? parseFloat(yearlyPrice) : null
      },
      billing: {
        billingCycle: 'monthly',
        paymentMethod: 'razorpay',
        autoRenewal: true,
        trialPeriod: 0,
        gracePeriod: 7
      },
      business: {
        isActive: true,
        isVisible: published ?? true, // Match published status
        isPopular: popular || false,
        sortOrder: order || 0
      },
      features: {
        unlimitedLectures: true,
        prioritySupport: supportLevel === 'premium' || supportLevel === 'vip',
        downloadableContent: downloadEnabled || false,
        certificates: certificateEnabled || false,
        lifetimeAccess: false,
        communityAccess: true,
        mentoringSessions: 0,
        customLearningPath: false,
        progressTracking: true,
        mobileAccess: true,
        offlineAccess: false
      },
      includedCourses: includedCourses,
      audit: {
        createdBy: req.user._id
      }
    });

    const savedPlan = await newPlan.save();
    const populatedPlan = await SubscriptionPlan.findById(savedPlan._id)
      .populate({
        path: 'includedCourses.courseId',
        select: 'title instructor difficulty duration',
        transform: (doc) => {
          if (!doc || !doc._id) {
            return {
              _id: null,
              title: 'Course No Longer Available',
              instructor: 'N/A',
              difficulty: 'Unknown',
              duration: 0
            };
          }
          return {
            _id: doc._id,
            title: doc.title,
            instructor: doc.instructor,
            difficulty: doc.difficulty,
            duration: doc.duration
          };
        }
      });

    // Ensure populated plan returns course IDs as strings, not objects
    if (populatedPlan && populatedPlan.includedCourses) {
      populatedPlan.includedCourses = populatedPlan.includedCourses
        .map(courseAccess => ({
          ...courseAccess,
          courseId: courseAccess.courseId?._id?.toString() || courseAccess.courseId?.toString() || courseAccess.courseId
        }));
    }

    res.status(201).json({
      message: 'Subscription plan created successfully',
      plan: populatedPlan
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A plan with this slug already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update subscription plan (admin only)
router.put('/admin/plans/:id', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🆙 UPDATE ROUTE HIT! Plan ID:', req.params.id);
    const planId = req.params.id;
    const updateData = req.body;

    // Get current plan to compare status
    const currentPlan = await SubscriptionPlan.findById(planId);
    console.log('� CURRENT PLAN STATUS: published =', currentPlan?.published, 'Type:', typeof currentPlan?.published);

    console.log('🔄 UPDATE DEBUG: Received update request for plan:', planId);
    console.log('🔄 UPDATE DEBUG: Full update data:', JSON.stringify(updateData, null, 2));
    console.log('�🔄 UPDATE DEBUG: published field received:', updateData.published, 'Type:', typeof updateData.published);

    // Validate required fields
    if (updateData.name && !updateData.slug) {
      return res.status(400).json({ message: 'Slug is required when updating name' });
    }

    if (updateData.slug) {
      // Check for duplicate slug (excluding current plan)
      const existingPlan = await SubscriptionPlan.findOne({
        slug: updateData.slug,
        _id: { $ne: planId }
      });
      if (existingPlan) {
        return res.status(400).json({ message: 'A plan with this slug already exists' });
      }
    }

    // ✅ FIX: Process coursesIncluded properly - ensure it's an array of ObjectIds
    if (updateData.coursesIncluded && updateData.coursesIncluded.length > 0) {
      console.log('🔍 UPDATE: Processing coursesIncluded field');
      console.log('🔍 UPDATE: Raw coursesIncluded:', updateData.coursesIncluded);

      // Handle both string IDs, object IDs, and populated course objects
      console.log('🔍 Processing course items...');
      const processedCourseIds = updateData.coursesIncluded
        .filter(id => id)  // Remove null/undefined
        .map((item, index) => {
          console.log(`🔍 Item ${index} type:`, typeof item);

          try {
            if (item && typeof item === 'object' && item.courseId) {
              // Handle CASE 1: Already formatted embedded course object
              // e.g., { courseId: ObjectId('...'), courseName: '...', accessLevel: '...' }
              console.log(`🔍 Embedded object - courseId:`, typeof item.courseId);
              if (typeof item.courseId === 'object' && item.courseId._id) {
                return item.courseId._id.toString();
              } else if (typeof item.courseId === 'string') {
                return item.courseId;
              } else {
                return item.courseId?.toString() || null;
              }
            } else if (item && typeof item === 'object' && item._id) {
              // Handle CASE 2: Populated course object with _id field
              // e.g., { _id: ObjectId('...'), title: '...', instructor: '...' }
              console.log(`🔍 Populated course - _id:`, item._id);
              return item._id.toString();
            } else if (typeof item === 'string') {
              // Handle CASE 3: Already a string ID
              console.log(`🔍 String ID:`, item);
              return item;
            } else if (item && typeof item === 'object' && item.toString) {
              // Handle CASE 4: Object with toString method
              console.log(`🔍 Object with toString:`, item.toString());
              return item.toString();
            }
            console.log(`⚠️ Unhandled item type for item ${index}:`, item);
            return null;
          } catch (error) {
            console.log('⚠️ Error processing course item:', item, error);
            return null;
          }
        })
        .filter(id => id !== null); // Remove any null values

      console.log('✅ Final processed course IDs:', processedCourseIds);

      console.log('✅ UPDATE: Processed course IDs:', processedCourseIds);

      // Validate that courses exist in database
      if (processedCourseIds.length > 0) {
        try {
          const existingCourses = await Course.find({
            _id: { $in: processedCourseIds.map(id => new mongoose.Types.ObjectId(id)) }
          }, '_id title').lean();

          if (existingCourses.length !== processedCourseIds.length) {
            const existingIds = existingCourses.map(course => course._id.toString());
            console.log('⚠️ Some course IDs were invalid or deleted');
            console.log('   Requested:', processedCourseIds);
            console.log('   Existing:', existingIds);

            // Use only valid course IDs
            updateData.coursesIncluded = processedCourseIds.filter(id =>
              existingIds.includes(id)
            );
          } else {
            updateData.coursesIncluded = processedCourseIds;
          }

          console.log('✅ FINAL: Courses to save in plan:', updateData.coursesIncluded);

        } catch (validationError) {
          console.log('⚠️ Course validation error:', validationError.message);
          // If validation fails, set to processed IDs
          updateData.coursesIncluded = processedCourseIds;
        }
      } else {
        updateData.coursesIncluded = [];
      }
    } else {
      // If no courses specified in update, keep existing courses
      console.log('ℹ️ UPDATE: No courses specified, keeping existing');
    }

    // CRITICAL FIX: Ensure coursesIncluded is saved with proper course details
    if (updateData.coursesIncluded && updateData.coursesIncluded.length > 0) {
      // Fetch course details to populate required fields
      const existingCourseDetails = await Course.find({
        _id: { $in: updateData.coursesIncluded }
      }).select('_id title slug').lean();

      console.log('✅ UPDATE: Fetched course details:', existingCourseDetails);

      // Create Map for quick lookup
      const courseMap = new Map();
      existingCourseDetails.forEach(course => {
        courseMap.set(course._id.toString(), { title: course.title, slug: course.slug });
      });

      // Format the includedCourses array with proper details
      updateData.includedCourses = updateData.coursesIncluded.map(courseId => {
        const courseInfo = courseMap.get(courseId.toString());
        if (!courseInfo) {
          console.log(`⚠️ UPDATE: Course ${courseId} not found, using defaults`);
          return {
            courseId: courseId,
            courseName: 'Unknown Course',
            courseSlug: 'unknown-course',
            accessLevel: 'full'
          };
        }

        return {
          courseId: courseId,
          courseName: courseInfo.title,
          courseSlug: courseInfo.slug,
          accessLevel: 'full'
        };
      });

      // Remove the coursesIncluded field to avoid conflicts
      delete updateData.coursesIncluded;
      console.log('✅ UPDATE: Fully formatted includedCourses array:', updateData.includedCourses);
    }

    // Process numeric fields
    if (updateData.monthlyPrice !== undefined) {
      updateData.monthlyPrice = updateData.monthlyPrice ? parseFloat(updateData.monthlyPrice) : null;
    }
    if (updateData.yearlyPrice !== undefined) {
      updateData.yearlyPrice = updateData.yearlyPrice ? parseFloat(updateData.yearlyPrice) : null;
    }
    if (updateData.maxCourses !== undefined) {
      updateData.maxCourses = updateData.maxCourses ? parseInt(updateData.maxCourses) : null;
    }
    if (updateData.duration !== undefined) {
      updateData.duration = parseInt(updateData.duration) || 1;
    }
    if (updateData.order !== undefined) {
      updateData.order = parseInt(updateData.order) || 0;
    }

    // Process boolean and string fields
    if (updateData.published !== undefined) {
      console.log('🔄 UPDATE DEBUG: Processing published field:', updateData.published);
      updateData.published = Boolean(updateData.published);
    }

    // Process feature-related fields
    if (updateData.supportLevel !== undefined) {
      console.log('🔄 UPDATE DEBUG: Processing supportLevel field:', updateData.supportLevel);
      updateData.supportLevel = updateData.supportLevel || 'basic';
    }
    if (updateData.certificateEnabled !== undefined) {
      console.log('🔄 UPDATE DEBUG: Processing certificateEnabled field:', updateData.certificateEnabled);
      updateData.certificateEnabled = Boolean(updateData.certificateEnabled);
    }
    if (updateData.quizEnabled !== undefined) {
      console.log('🔄 UPDATE DEBUG: Processing quizEnabled field:', updateData.quizEnabled);
      updateData.quizEnabled = Boolean(updateData.quizEnabled);
    }
    if (updateData.downloadEnabled !== undefined) {
      console.log('🔄 UPDATE DEBUG: Processing downloadEnabled field:', updateData.downloadEnabled);
      updateData.downloadEnabled = Boolean(updateData.downloadEnabled);
    }

    // Process popularity field
    if (updateData.popular !== undefined) {
      console.log('🔄 UPDATE DEBUG: Processing popular field:', updateData.popular);
      updateData.popular = Boolean(updateData.popular);
    }

    // Map flat fields to nested schema structure for features
    console.log('🔄 UPDATE DEBUG: Mapping features fields...');
    console.log('🔄 UPDATE DEBUG: Before mapping - updateData.features:', updateData.features);

    // CRITICAL FIX: Handle empty features array conflict
    if (updateData.features && Array.isArray(updateData.features) && updateData.features.length === 0) {
      console.log('🔄 UPDATE DEBUG: Empty features array detected, removing to prevent override');
      delete updateData.features; // Prevent empty array from overriding nested field mapping
    }

    if (updateData.supportLevel !== undefined || updateData.certificateEnabled !== undefined ||
        updateData.quizEnabled !== undefined || updateData.downloadEnabled !== undefined) {

      updateData.features = updateData.features || {};

      console.log('🔄 UPDATE DEBUG: Setting feature mappings:');
      console.log('  - supportLevel received:', updateData.supportLevel);
      console.log('  - certificateEnabled received:', updateData.certificateEnabled);
      console.log('  - quizEnabled received:', updateData.quizEnabled);
      console.log('  - downloadEnabled received:', updateData.downloadEnabled);

      if (updateData.supportLevel !== undefined) {
        updateData.features.prioritySupport = (updateData.supportLevel === 'premium' || updateData.supportLevel === 'vip');
        console.log('  ✅ Mapped prioritySupport to:', updateData.features.prioritySupport);
      }

      if (updateData.certificateEnabled !== undefined) {
        updateData.features.certificates = Boolean(updateData.certificateEnabled);
        console.log('  ✅ Mapped certificates to:', updateData.features.certificates);
      }

      if (updateData.quizEnabled !== undefined) {
        updateData.features.quizEnabled = Boolean(updateData.quizEnabled);
        console.log('  ✅ Mapped quizEnabled to:', updateData.features.quizEnabled);
      }

      if (updateData.downloadEnabled !== undefined) {
        updateData.features.downloadableContent = Boolean(updateData.downloadEnabled);
        console.log('  ✅ Mapped downloadableContent to:', updateData.features.downloadableContent);
      }
    } else {
      console.log('🔄 UPDATE DEBUG: No feature fields found in updateData');
    }

    console.log('🔄 UPDATE DEBUG: After mapping - updateData.features:', JSON.stringify(updateData.features, null, 2));

    // Map popularity to business schema
    if (updateData.popular !== undefined) {
      updateData.business = updateData.business || {};
      updateData.business.isPopular = Boolean(updateData.popular);
      console.log('🔄 UPDATE DEBUG: Set business.isPopular:', updateData.business.isPopular);
    }

    // Map order to business schema
    if (updateData.order !== undefined) {
      updateData.business = updateData.business || {};
      updateData.business.sortOrder = parseInt(updateData.order) || 0;
      console.log('🔄 UPDATE DEBUG: Set business.sortOrder:', updateData.business.sortOrder);
    }

    updateData.updatedBy = req.user._id;
    updateData.updatedAt = new Date();

    console.log('🔄 UPDATE DEBUG: Final updateData before database update:', JSON.stringify(updateData, null, 2));
    console.log('🔄 UPDATE DEBUG: published in updateData:', updateData.published);
    console.log('🔄 UPDATE DEBUG: monthlyPrice in updateData:', updateData.monthlyPrice);
    console.log('🔄 UPDATE DEBUG: pricing in updateData:', updateData.pricing);
    console.log('🔄 UPDATE DEBUG: supportLevel in updateData:', updateData.supportLevel);
    console.log('🔄 UPDATE DEBUG: certificateEnabled in updateData:', updateData.certificateEnabled);

    // Ensure published field is explicitly handled
    if (updateData.published !== undefined) {
      updateData.published = Boolean(updateData.published);
      console.log('🔄 UPDATE DEBUG: Explicitly set published to:', updateData.published);
    }

    // First update the plan
    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('🔄 UPDATE DEBUG: Plan updated, now verifying final state...');

    // Re-fetch the plan to verify changes
    const verifiedPlan = await SubscriptionPlan.findById(planId).populate({
      path: 'includedCourses.courseId',
      select: 'title instructor difficulty duration instructor slug',
      transform: (doc) => {
        if (!doc || !doc._id) {
          return null;
        }
        return {
          _id: doc._id.toString(),
          title: doc.title,
          instructor: doc.instructor,
          difficulty: doc.difficulty,
          duration: doc.duration,
          slug: doc.slug
        };
      }
    });

    console.log('🔄 UPDATE DEBUG: VERIFICATION - Final features:', verifiedPlan.features);
    console.log('🔄 UPDATE DEBUG: VERIFICATION - Support level:', verifiedPlan.features?.prioritySupport);
    console.log('🔄 UPDATE DEBUG: VERIFICATION - Certificates:', verifiedPlan.features?.certificates);
    console.log('🔄 UPDATE DEBUG: VERIFICATION - Quiz enabled:', verifiedPlan.features?.quizEnabled);
    console.log('🔄 UPDATE DEBUG: VERIFICATION - Downloads:', verifiedPlan.features?.downloadableContent);

    // Use the verified plan for response
    const responsePlan = verifiedPlan;

    if (!updatedPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // ✅ CRITICAL FIX: Ensure included courses are formatted properly for frontend
    if (updatedPlan.includedCourses && updatedPlan.includedCourses.length > 0) {
      // Remove duplicates and ensure proper formatting
      const uniqueCourses = [];
      const courseIds = new Set();

      updatedPlan.includedCourses.forEach(courseAccess => {
        if (courseAccess && courseAccess.courseId && !courseIds.has(courseAccess.courseId._id?.toString())) {
          courseIds.add(courseAccess.courseId._id?.toString());
          uniqueCourses.push({
            ...courseAccess.toObject(),
            courseId: courseAccess.courseId,
            courseName: courseAccess.courseId?.title || courseAccess.courseName || 'Unknown Course',
            courseSlug: courseAccess.courseId?.slug || courseAccess.courseSlug || 'unknown-course'
          });
        }
      });

      // Replace with deduplicated courses
      updatedPlan.includedCourses = uniqueCourses;
    }

    res.json({
      message: 'Subscription plan updated successfully',
      plan: updatedPlan
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A plan with this slug already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete subscription plan (admin only)
router.delete('/admin/plans/:id', auth, requireAdmin, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // Check if plan has active subscribers
    if (plan.subscribers && plan.subscribers.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete plan with active subscribers. Archive the plan instead.'
      });
    }

    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish/Unpublish subscription plan (admin only)
router.patch('/admin/plans/:id/publish', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🔄 PUBLISH ROUTE: Request received');
    console.log('🔄 PUBLISH ROUTE: Plan ID:', req.params.id);
    console.log('🔄 PUBLISH ROUTE: Body:', req.body);
    console.log('🔄 PUBLISH ROUTE: published value:', req.body.published);

    const { published } = req.body;
    const planId = req.params.id;

    // Validate input
    if (published === undefined) {
      console.log('❌ PUBLISH ROUTE: published field is missing');
      return res.status(400).json({ message: 'published field is required' });
    }

    // Find current plan state
    const currentPlan = await SubscriptionPlan.findById(planId);
    if (!currentPlan) {
      console.log('❌ PUBLISH ROUTE: Plan not found');
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    console.log('📊 PUBLISH ROUTE: Current plan state - published:', currentPlan.published);
    console.log('📊 PUBLISH ROUTE: New published value:', published);

    // Update the plan using business.isActive/business.isVisible fields
    const updateFields = {
      'business.isActive': Boolean(published),
      'business.isVisible': Boolean(published),
      'audit.updatedBy': req.user._id,
      'audit.updatedAt': new Date()
    };

    console.log('🔄 PUBLISH ROUTE: Update fields:', updateFields);

    // Update the plan
    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      updateFields,
      { new: true, runValidators: true }
    );

    console.log('✅ PUBLISH ROUTE: Update result - published:', updatedPlan?.published);
    console.log('✅ PUBLISH ROUTE: Full updated plan:', {
      _id: updatedPlan._id,
      name: updatedPlan.name,
      published: updatedPlan.published,
      updatedAt: updatedPlan.updatedAt
    });

    // Verify the update in database
    const verifyPlan = await SubscriptionPlan.findById(planId).select('_id name published updatedAt updatedBy');
    console.log('🔍 PUBLISH ROUTE: Verification after save - published:', verifyPlan?.published);

    if (!updatedPlan) {
      console.log('❌ PUBLISH ROUTE: Update failed');
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const message = `Subscription plan ${Boolean(published) ? 'published' : 'unpublished'} successfully`;
    console.log('🎉 PUBLISH ROUTE: Success message:', message);

    // Derive published status from business fields for the response
    const responsePlan = updatedPlan.toObject();
    responsePlan.published = updatedPlan.business?.isActive && updatedPlan.business?.isVisible || false;

    res.json({
      message,
      plan: responsePlan,
      verification: {
        id: verifyPlan?._id,
        published: responsePlan.published, // Use derived published status
        updatedAt: verifyPlan?.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ PUBLISH ROUTE: Error:', error);
    console.error('❌ PUBLISH ROUTE: Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Subscribe user to plan
router.post('/subscribe/:planId', auth, async (req, res) => {
  try {
    const { billingCycle = 'monthly' } = req.body; // monthly or yearly
    const plan = await SubscriptionPlan.findById(req.params.planId);

    if (!plan || !plan.published) {
      return res.status(404).json({ message: 'Subscription plan not found or not available' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a plan
    if (user.subscription && user.subscription.endDate > new Date()) {
      return res.status(400).json({
        message: 'You already have an active subscription. Please wait for it to expire or manage your current subscription.'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const duration = plan.duration || 1; // months
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    // Calculate price based on billing cycle
    const price = billingCycle === 'yearly' && plan.yearlyPrice
      ? plan.yearlyPrice
      : plan.monthlyPrice;

    // Create subscription record
    const subscription = {
      planId: plan._id,
      planName: plan.name,
      billingCycle,
      price,
      startDate,
      endDate,
      status: 'completed',
      coursesIncluded: plan.coursesIncluded,
      features: plan.features,
      supportLevel: plan.supportLevel || 'basic',
      maxCourses: plan.maxCourses,
      certificateEnabled: plan.certificateEnabled,
      quizEnabled: plan.quizEnabled,
      downloadEnabled: plan.downloadEnabled
    };

    user.subscription = subscription;
    await user.save();

    // Add user to plan's subscribers list
    plan.subscribers = plan.subscribers || [];
    if (!plan.subscribers.includes(req.user._id)) {
      plan.subscribers.push(req.user._id);
      await plan.save();
    }

    res.json({
      message: 'Successfully subscribed to plan',
      subscription,
      plan: {
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        billingCycle
      }
    });
  } catch (error) {
    console.error('Error subscribing to plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's subscription
router.get('/my-subscription', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.subscription) {
      return res.json(null);
    }

    const plan = await SubscriptionPlan.findById(user.subscription.planId)
      .populate({
        path: 'includedCourses.courseId',
        select: 'title description instructor difficulty duration'
      });

    res.json({
      subscription: user.subscription,
      plan
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel subscription (user)
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.subscription || user.subscription.status !== 'completed') {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    // Remove user from plan's subscribers list
    const plan = await SubscriptionPlan.findById(user.subscription.planId);
    if (plan) {
      plan.subscribers = plan.subscribers.filter(id => !id.equals(req.user._id));
      await plan.save();
    }

    // Cancel subscription (keep record for history)
    user.subscription.status = 'cancelled';
    user.subscription.cancelledAt = new Date();
    await user.save();

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user has access to a course
router.get('/check-access/:courseId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.subscription) {
      return res.json({ hasAccess: false, reason: 'No active subscription' });
    }

    if (user.subscription.status !== 'completed') {
      return res.json({ hasAccess: false, reason: 'Subscription is not active' });
    }

    if (user.subscription.endDate <= new Date()) {
      return res.json({ hasAccess: false, reason: 'Subscription has expired' });
    }

    const courseId = req.params.courseId;
    const plan = await SubscriptionPlan.findById(user.subscription.planId);

    if (!plan || !plan.coursesIncluded.some(id => id.toString() === courseId)) {
      return res.json({ hasAccess: false, reason: 'Course not included in your plan' });
    }

    // Check max courses limit if set
    if (plan.maxCourses && plan.coursesIncluded.length > plan.maxCourses) {
      return res.json({ hasAccess: false, reason: 'Course access limit reached' });
    }

    res.json({
      hasAccess: true,
      subscription: {
        planName: plan.name,
        endDate: user.subscription.endDate,
        features: plan.features
      }
    });
  } catch (error) {
    console.error('Error checking course access:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get subscription analytics (admin)
router.get('/admin/analytics', auth, requireAdmin, async (req, res) => {
  try {
    const totalPlans = await SubscriptionPlan.countDocuments();
    const publishedPlans = await SubscriptionPlan.countDocuments({ published: true });

    const totalSubscribers = await User.countDocuments({
      'subscription.status': 'completed',
      'subscription.endDate': { $gt: new Date() }
    });

    // Revenue calculations
    const activeSubscriptions = await User.find({
      'subscription.status': 'completed',
      'subscription.endDate': { $gt: new Date() }
    }, 'subscription');

    let monthlyRevenue = 0;
    let yearlyRevenue = 0;

    activeSubscriptions.forEach(user => {
      if (user.subscription.billingCycle === 'yearly') {
        yearlyRevenue += user.subscription.price;
      } else {
        monthlyRevenue += user.subscription.price;
      }
    });

    const totalRevenue = monthlyRevenue * 12 + yearlyRevenue;

    res.json({
      analytics: {
        totalPlans,
        publishedPlans,
        totalSubscribers,
        monthlyRevenue,
        yearlyRevenue,
        totalRevenue,
        averageSubscriptionValue: totalSubscribers > 0 ? totalRevenue / totalSubscribers : 0
      }
    });
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
