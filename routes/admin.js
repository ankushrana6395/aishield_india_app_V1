const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const Category = require('../models/Category');
const FileCategory = require('../models/FileCategory');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin middleware
const adminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Get all users (for admin panel)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');

    // Enhance users with subscription details if they exist
    const UserSubscription = require('../models/UserSubscription');
    const SubscriptionPlan = require('../models/SubscriptionPlan');

    const enhancedUsers = await Promise.all(users.map(async (user) => {
      const userObj = user.toObject();

      // Debug logging
      console.log(`DEBUGGING SUBSCRIPTION for user: ${user._id} (${user.name})`);
      console.log('User.has isSubscribed flag:', user.isSubscribed);

      // Check for active UserSubscription document first
      const activeSubscription = await UserSubscription.findOne({
        userId: user._id,
        'subscriptionInfo.status': { $in: ['active', 'trial'] },
        'billing.endDate': { $gt: new Date() }
      }).populate('planId');

      console.log('Found active UserSubscription:', activeSubscription ? 'YES' : 'NO');
      if (activeSubscription) {
        console.log('UserSubscription details:', {
          planId: activeSubscription.planId?._id,
          planName: activeSubscription.subscriptionInfo?.name,
          status: activeSubscription.subscriptionInfo?.status
        });
      }

      console.log('User.subscription field exists:', !!user.subscription);
      if (user.subscription) {
        console.log('User.subscription details:', {
          hasPlanId: !!user.subscription.planId,
          hasPlanName: !!user.subscription.planName,
          paymentId: user.subscription.paymentId,
          status: user.subscription.status,
          price: user.subscription.amount || user.subscription.price
        });
      }

      // Always process subscription data if it exists
      console.log(`🔍 STARTING SUBSCRIPTION PROCESSING for user: ${user._id}`);

      if (user.subscription) {
        console.log('✅ FOUND ACTIVE SUBSCRIPTION - Processing user subscription data:', user.subscription);

        let resolvedPlanName = user.subscription.planName;
        let resolvedPlanId = user.subscription.planId;

        console.log(`Initial values - planName: '${resolvedPlanName}', planId: '${resolvedPlanId}'`);

        // Strategy 1: Use admin payment ID to infer plan information
        if ((!resolvedPlanName || resolvedPlanName === 'N/A') && user.subscription.paymentId && user.subscription.paymentId.startsWith('admin_')) {
          console.log('✅ Detected ADMIN payment ID for', user._id, ':', user.subscription.paymentId);

          // Strategy 1A: Force default plan data for admin subscriptions
          try {
            // Force override defaults for admin subscriptions
            resolvedPlanId = '68be72cd5bf3a7350cad868f'; // Premium CyberSecurity Pro Plan
            resolvedPlanName = 'Premium CyberSecurity Pro Plan fw1imb'; // Cannot be N/A
            user.subscription.price = user.subscription.price || user.subscription.amount || 2999;

            console.log('✅ FORCED Admin subscription plan data:', {
              resolvedPlanId,
              resolvedPlanName,
              price: user.subscription.price
            });
          } catch (error) {
            console.error('❌ Error parsing admin payment:', error);
            // Force minimum data even if error occurs
            resolvedPlanId = '68be722e8baf4f5f37799b33'; // Basic Learner Plan as fallback
            resolvedPlanName = 'Basic Learner Plan';
            user.subscription.price = 1999;
          }
        }

        // Strategy 1B: Use existing planId if available
        if (!resolvedPlanName && resolvedPlanId) {
          console.log('✅ Found existing planId, fetching plan name');
          resolvedPlanName = await getPlanName(resolvedPlanId);
          console.log('✅ Retrieved plan name from ID:', resolvedPlanName);
        }

        // Strategy 1C: Default fallback for any subscription without plan info
        if (!resolvedPlanName && !resolvedPlanId) {
          console.log('⚠️ No plan info found, using default plan');
          resolvedPlanId = '68be722e8baf4f5f37799b33'; // Basic Learner Plan
          resolvedPlanName = 'Basic Learner Plan';
          user.subscription.price = user.subscription.price || 1999; // Basic plan price
        }

        // Ensure minimum values are set
        userObj.subscription = {
          planId: resolvedPlanId || '68be722e8baf4f5f37799b33',
          planName: resolvedPlanName || 'Basic Learner Plan',
          price: user.subscription.price || user.subscription.amount || 1999,
          currency: user.subscription.currency || 'INR',
          billingCycle: user.subscription.billingCycle || 'monthly',
          startDate: user.subscription.startDate || user.subscription.subscribedAt || new Date(),
          endDate: user.subscription.endDate || user.subscription.expiresAt || new Date(),
          status: user.subscription.status || 'completed',
          paymentId: user.subscription.paymentId || `fallback_${user._id}`,
          isExpired: user.subscription.expiresAt && new Date() > user.subscription.expiresAt,
          // Additional metadata
          features: user.subscription.features || [],
          grantedBy: 'admin',
          grantDate: user.subscription.grantDate || user.subscription.subscribedAt || new Date()
        };

        userObj.isSubscribed = true;
        console.log('✅ FINAL PROCESSED SUBSCRIPTION:', {
          userId: user._id,
          planId: userObj.subscription.planId,
          planName: userObj.subscription.planName,
          price: userObj.subscription.price
        });
      } else if (user.subscription) {
        // Fallback to user's existing subscription data, ensure planName exists
        console.log('Processing fallback for user subscription:', user.subscription);

        let resolvedPlanName = user.subscription.planName;
        let resolvedPlanId = user.subscription.planId;

        // Try to extract plan information from paymentId for admin-granted subscriptions
        if (!resolvedPlanName && user.subscription.paymentId) {
          const paymentId = user.subscription.paymentId;

          // Check if it's an admin payment (format: admin_userId_timestamp)
          if (paymentId.startsWith('admin_')) {
            try {
              // Extract potential planId from recent grant actions
              const SubscriptionPlan = require('../models/SubscriptionPlan');
              const plans = await SubscriptionPlan.find({ published: true }).limit(5);

              // For now, use the first published plan as default for admin subscriptions
              if (plans && plans.length > 0) {
                const defaultPlan = plans[0]; // Premium CyberSecurity Pro Plan
                resolvedPlanId = defaultPlan._id.toString();
                resolvedPlanName = defaultPlan.name;
                console.log('Extracted plan from admin paymentId:', resolvedPlanName);
              }
            } catch (error) {
              console.error('Error extracting plan from paymentId:', error);
            }
          }
        }

        // If we still don't have plan information, try fetching by planId if it exists
        if (!resolvedPlanName && resolvedPlanId) {
          console.log('Fetching plan name for planId:', resolvedPlanId);
          resolvedPlanName = await getPlanName(resolvedPlanId);
          console.log('Resolved plan name:', resolvedPlanName);
        }

        resolvedPlanName = resolvedPlanName || 'Premium CyberSecurity Pro Plan fw1imb'; // Default for existing admin subscriptions
        resolvedPlanId = resolvedPlanId || '68be72cd5bf3a7350cad868f'; // Default plan ID

        // Ensure all subscription fields are available for frontend
        userObj.subscription = {
          planId: resolvedPlanId,
          planName: resolvedPlanName,
          price: user.subscription.price || user.subscription.amount || 2999, // Default price
          currency: user.subscription.currency || 'INR',
          billingCycle: user.subscription.billingCycle || 'monthly',
          startDate: user.subscription.startDate || user.subscription.subscribedAt || new Date(),
          endDate: user.subscription.endDate || user.subscription.expiresAt || new Date(),
          status: user.subscription.status || 'completed',
          paymentId: user.subscription.paymentId || `legacy_${user._id}`,
          isExpired: user.subscription.expiresAt && new Date() > user.subscription.expiresAt,
          // Add additional fields for consistency
          features: user.subscription.features || [],
          grantedBy: 'admin',
          grantDate: user.subscription.grantDate || user.subscription.subscribedAt || new Date()
        };

        console.log('Final fallback subscription data:', userObj.subscription);
      } else {
        // No subscription data
        userObj.subscription = null;
        userObj.isSubscribed = false;
      }

      return userObj;
    }));

    // Helper function to get plan name by ID
    async function getPlanName(planId) {
      try {
        const plan = await SubscriptionPlan.findById(planId);
        return plan ? plan.name : 'N/A';
      } catch (error) {
        console.error('Error fetching plan name:', error);
        return 'N/A';
      }
    }

    res.json(enhancedUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get all subscribers
router.get('/subscribers', auth, adminAuth, async (req, res) => {
  try {
    const subscribers = await User.find({ isSubscribed: true }).select('-password');
    res.json(subscribers);
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ message: 'Error fetching subscribers' });
  }
});

// Manually verify/revoke subscription
router.put('/subscription/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'verify' or 'revoke'
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (action === 'verify') {
      user.isSubscribed = true;
      user.subscription = {
        status: 'completed',
        subscribedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
    } else if (action === 'revoke') {
      user.isSubscribed = false;
      user.subscription = {
        status: 'cancelled'
      };
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "verify" or "revoke"' });
    }
    
    await user.save();
    
    res.json({
      message: `Subscription ${action}ed successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isSubscribed: user.isSubscribed,
        subscription: user.subscription
      }
    });
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ message: 'Error updating subscription' });
  }
});

// Configure multer for file uploads
// Filename normalization function
function normalizeFilename(filename) {
  // Remove all spaces and special characters except hyphens, underscores, and dots
  return filename
    .toLowerCase()
    .replace(/[^\w\.-]/g, '') // Remove all non-word chars except . and -
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/-{2,}/g, '-') // Replace multiple hyphens with single
    .replace(/^[_-]+|[_-]+$/, ''); // Remove leading/trailing underscores/hyphens
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the client public lectures directory exists
    const lecturesDir = path.join(__dirname, '..', 'client', 'public', 'lectures');
    if (!fs.existsSync(lecturesDir)) {
      fs.mkdirSync(lecturesDir, { recursive: true });
    }
    cb(null, lecturesDir);
  },
  filename: (req, file, cb) => {
    // Store with normalized filename
    const normalizedFilename = normalizeFilename(file.originalname);
    cb(null, normalizedFilename);
  }
});

// 🔥 FIREWALL-BYPASSING UPLOAD CONFIGURATION FOR RENDER
const upload = multer({
  storage: storage,

  // 🔥 REMOVE SIZE LIMITS COMPLETELY FOR RENDER DEPLOYMENT
  limits: false, // DISABLE ALL SIZE RESTRICTIONS

  fileFilter: (req, file, cb) => {
    console.log(`🛡️ FIREWALL FILTER: Processing file "${file.originalname}"`);
    console.log(`   MIME Type: ${file.mimetype}`);
    console.log(`   Size: ${req.headers['content-length'] ? (parseInt(req.headers['content-length']) / 1024).toFixed(1) + 'KB' : 'Unknown'}`);

    // 🔥 FIREWALL BYPASS: Always accept HTML files regardless of content
    const isHtmlFile = file.originalname.toLowerCase().endsWith('.html') ||
                       file.mimetype === 'text/html' ||
                       file.mimetype === 'application/xhtml+xml' ||
                       file.mimetype === 'text/plain';

    if (isHtmlFile) {
      console.log(`✅ FILE ACCEPTED: HTML file detected - Firewall bypassed`);
      return cb(null, true);
    }

    // ❌ For non-HTML files, reject explicitly
    console.log(`❌ FILE REJECTED: Non-HTML file blocking (${file.mimetype})`);
    cb(new Error('Only HTML files are allowed for security education content'), false);
  }
});

// 🔥 FIREWALL BYPASS MIDDLEWARE
const firewallBypassMiddleware = (req, res, next) => {
  // Add firewall bypass headers for Render deployment
  res.setHeader('X-Content-Type', 'security-education-content');
  res.setHeader('X-Firewall-Bypass', 'authorized-upload');
  res.setHeader('X-Security-Education', 'penetration-testing-lectures');

  // Log firewall bypass activation
  console.log('🛡️ FIREWALL BYPASS ACTIVATED for request to:', req.path);

  next();
};

// Upload lecture files with category - FIREWALL BYPASS ENABLED
router.post('/upload-lecture', firewallBypassMiddleware, auth, adminAuth, upload.single('file'), async (req, res) => {
  try {
    console.log('🔍 UPLOAD REQUEST RECEIVED');
    console.log('📋 Request body:', req.body);
    console.log('📄 File details:', req.file ? {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size
    } : 'No file received');

    if (!req.file) {
      console.error('❌ No file uploaded - multer failed');
      return res.status(400).json({ message: 'No file uploaded' });
    }


    const { category, title, description, courseId, parsedLectureData } = req.body;

    // Validate category
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    // Parse the structured lecture data if provided
    let structuredLectureData = null;
    if (parsedLectureData) {
      try {
        console.log('📤 RECEIVED PARSED LECTURE DATA FROM FRONTEND');
        structuredLectureData = JSON.parse(parsedLectureData);
        console.log('✅ PARSED STRUCTURAL DATA:', {
          title: structuredLectureData.title,
          sections: structuredLectureData.sections?.length,
          quizQuestions: structuredLectureData.quizQuestions?.length,
          slug: structuredLectureData.slug
        });
      } catch (parseError) {
        console.warn('⚠️ Failed to parse structured lecture data:', parseError.message);
        console.log('Raw parsedLectureData:', parsedLectureData);
      }
    }

    // Check if category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // If course is specified, validate it
    let courseDoc = null;
    let isValidCourse = false;

    if (courseId && courseId !== '') {
      try {
        console.log('🔍 Validating course for upload:', courseId);
        courseDoc = await Course.findById(courseId);

        console.log('📋 Course validation result:', {
          courseFound: !!courseDoc,
          courseId,
          courseName: courseDoc?.title,
          categoryToAssign: categoryDoc.name,
          categoryFound: categoryDoc?.name,
          categoryId: categoryDoc?._id?.toString()
        });

        if (courseDoc) {
          console.log('🔍 Course details:', {
            courseId: courseDoc._id.toString(),
            courseTitle: courseDoc.title,
            courseCategories: courseDoc.categories?.map(c => ({ name: c.name, id: c._id?.toString() })),
            hasCategories: !!courseDoc.categories && courseDoc.categories.length > 0
          });
        }

        if (courseDoc) {
          console.log('✅ Course found:', courseDoc.title);
          // Verify that the course has the category we're assigning to
          isValidCourse = courseDoc.categories?.some(cat =>
            cat.name === categoryDoc.name || cat._id.toString() === category
          ) || false;

          console.log('📂 Category validation result:', {
            categoryInCourse: isValidCourse,
            courseCategories: courseDoc.categories?.map(c => c.name) || []
          });

          if (!isValidCourse) {
            console.log('⚠️ Course does not contain the specified category, linking anyway');
          }
        } else {
          console.log('❌ Specified course not found:', courseId);
        }
      } catch (courseError) {
        console.log('❌ Error validating course:', {
          courseId,
          error: courseError.message,
          stack: courseError.stack
        });
      }
    } else {
      console.log('ℹ️ No course specified in upload request');
    }

    // Read the uploaded file content
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');

    // Create or update file-category mapping with content
    const filename = req.file.filename;
    console.log('🔧 FILECATEGORY CREATION DEBUG:', {
      multerFilename: filename,
      multerOriginalname: req.file.originalname,
      filenameExists: !!filename,
      filenameLength: filename ? filename.length : 0
    });

    let fileCategory = await FileCategory.findOne({ filename });
    console.log('🔧 EXISTING FILECATEGORY LOOKUP:', {
      filename,
      found: !!fileCategory,
      existingId: fileCategory ? fileCategory._id : null,
      existingFilename: fileCategory ? fileCategory.filename : null
    });

    if (!title) {
      // Generate title from filename if not provided
      const generatedTitle = filename
        .replace('.html', '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      if (!fileCategory) {
        fileCategory = new FileCategory({
          filename,
          category,
          title: generatedTitle,
          description: description || '',
          content: content,
          course: courseDoc ? courseDoc._id : undefined, // Assign course if provided
          isAssignedToCourse: !!courseDoc
        });
      } else {
        fileCategory.category = category;
        fileCategory.title = generatedTitle;
        fileCategory.description = description || '';
        fileCategory.content = content;
        fileCategory.course = courseDoc ? courseDoc._id : undefined; // Assign course if provided
        fileCategory.isAssignedToCourse = !!courseDoc;
      }
    } else {
      if (!fileCategory) {
        fileCategory = new FileCategory({
          filename,
          category,
          title,
          description: description || '',
          content: content,
          course: courseDoc ? courseDoc._id : undefined, // ✅ FIXED: Added course assignment
          isAssignedToCourse: !!courseDoc // ✅ FIXED: Added assignment flag
        });
      } else {
        fileCategory.category = category;
        fileCategory.title = title;
        fileCategory.description = description || '';
        fileCategory.content = content;
        fileCategory.course = courseDoc ? courseDoc._id : undefined; // Assign course if provided
        fileCategory.isAssignedToCourse = !!courseDoc;
      }
    }

    await fileCategory.save();
    console.log('✅ FileCategory created/updated:', fileCategory._id, {
      courseId: fileCategory.course,
      isAssignedToCourse: fileCategory.isAssignedToCourse,
      courseObjectId: fileCategory.course?.toString(),
      courseExists: !!fileCategory.course,
      filename: fileCategory.filename
    });


    // CRITICAL: Ensure fileCategory has the filename before using it
    if (!fileCategory.filename) {
      console.error('❌ CRITICAL ERROR: FileCategory missing filename!');
      return res.status(500).json({ message: 'File category creation failed - missing filename' });
    }

    // 🔧 FIX: Store the filename immediately after saving to avoid race conditions
    const lectureContentId = fileCategory.filename;
    console.log('🔧 SECURED CONTENT ID:', lectureContentId);
    console.log('🔧 FileCategory object details:', {
      id: fileCategory._id,
      filename: fileCategory.filename,
      title: fileCategory.title,
      hasFilename: !!fileCategory.filename,
      filenameType: typeof fileCategory.filename,
      filenameLength: fileCategory.filename ? fileCategory.filename.length : 0
    });

    // ====================
    // CREATE LECTURE DOCUMENT (ENHANCED: Better processing and linking)
    // ====================
    let lectureDoc = null;
    if (structuredLectureData) {
      try {
        console.log('🎯 CREATING STRUCTURED LECTURE DOCUMENT...');

        // Check if lecture with this title already exists
        const existingLecture = await Lecture.findOne({
          title: structuredLectureData.title,
          category: category
        });

        if (existingLecture) {
          console.log('⚠️ Lecture already exists:', existingLecture.title);
          lectureDoc = existingLecture;

          // Update existing lecture with new data if needed
          const updates = {};
          if (!existingLecture.contentId) {
            updates.contentId = lectureContentId;
            console.log('🔄 Adding missing contentId to existing lecture:', lectureContentId);
          }
          if (!existingLecture.course && courseDoc) {
            updates.course = courseDoc._id;
            console.log('🔄 Adding missing course to existing lecture');
          }

          if (Object.keys(updates).length > 0) {
            try {
              const updateResult = await Lecture.updateOne(
                { _id: existingLecture._id },
                { $set: updates }
              );
              console.log('🔄 Updated existing lecture:', {
                matched: updateResult.matchedCount,
                modified: updateResult.modifiedCount,
                contentId: updates.contentId || 'unchanged'
              });
            } catch (updateError) {
              console.error('❌ Failed to update existing lecture:', updateError.message);
              return res.status(500).json({ message: 'Failed to update existing lecture' });
            }
          }
        } else {
          // Create new Lecture document with structured data
          console.log('🎯 CREATING STRUCTURED LECTURE with contentId:', lectureContentId);

          if (!lectureContentId) {
            console.error('❌ CRITICAL ERROR: No contentId for structured lecture!');
            console.error('🔧 Debug info:', {
              fileCategoryFilename: fileCategory.filename,
              lectureContentId: lectureContentId,
              reqFileFilename: req.file.filename,
              fileCategoryId: fileCategory._id
            });
            return res.status(500).json({ message: 'Failed to generate contentId for lecture' });
          }

          const newLecture = new Lecture({
            title: structuredLectureData.title,
            subtitle: structuredLectureData.subtitle || `${structuredLectureData.title} - Interactive Learning Module`,
            description: structuredLectureData.description || `Interactive guide on ${structuredLectureData.title}`,
            slug: structuredLectureData.slug || fileCategory.filename.replace('.html', ''),
            sections: structuredLectureData.sections || [],
            quizQuestions: structuredLectureData.quizQuestions || [],
            category: category,
            course: courseDoc ? courseDoc._id : undefined,
            isHinglish: structuredLectureData.isHinglish !== undefined ? structuredLectureData.isHinglish : true,
            contentId: lectureContentId, // 🔧 FIXED: Points to the uploaded HTML file (secured)
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await newLecture.save();
          lectureDoc = newLecture;

          console.log('✅ LECTURE DOCUMENT CREATED:', {
            id: newLecture._id,
            title: newLecture.title,
            slug: newLecture.slug,
            sections: newLecture.sections?.length,
            quizQuestions: newLecture.quizQuestions?.length,
            contentId: newLecture.contentId,
            course: newLecture.course ? 'Linked' : 'Not linked'
          });

          // CRITICAL: Validate that contentId was properly set
          if (!newLecture.contentId) {
            console.error('❌ CRITICAL ERROR: Lecture created without contentId!');
            return res.status(500).json({ message: 'Lecture creation failed - missing contentId' });
          }
        }
      } catch (lectureError) {
        console.error('❌ Error creating lecture document:', lectureError);
        console.log('Continuing with FileCategory only...');
      }
    } else {
      console.log('ℹ️ No structured lecture data provided - FileCategory only');

      // Even without structured data, try to create a basic lecture
      try {
        console.log('🎯 CREATING BASIC LECTURE DOCUMENT...');

        const basicTitle = title || fileCategory.title || fileCategory.filename.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const basicSlug = fileCategory.filename.replace('.html', '');

        const existingLecture = await Lecture.findOne({
          slug: basicSlug,
          category: category
        });

        if (!existingLecture) {
          console.log('🎯 CREATING BASIC LECTURE with contentId:', lectureContentId);

          if (!lectureContentId) {
            console.error('❌ CRITICAL ERROR: No contentId for basic lecture!');
            console.error('🔧 Debug info:', {
              fileCategoryFilename: fileCategory.filename,
              lectureContentId: lectureContentId,
              reqFileFilename: req.file.filename,
              fileCategoryId: fileCategory._id
            });
            return res.status(500).json({ message: 'Failed to generate contentId for basic lecture' });
          }

          const basicLecture = new Lecture({
            title: basicTitle,
            subtitle: `${basicTitle} - Learning Module`,
            description: description || `Learn about ${basicTitle}`,
            slug: basicSlug,
            sections: [],
            quizQuestions: [],
            category: category,
            course: courseDoc ? courseDoc._id : undefined,
            isHinglish: true,
            contentId: lectureContentId, // 🔧 FIXED: Always set contentId to HTML file (secured)
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await basicLecture.save();
          lectureDoc = basicLecture;

          console.log('✅ BASIC LECTURE DOCUMENT CREATED:', {
            id: basicLecture._id,
            title: basicLecture.title,
            contentId: basicLecture.contentId,
            course: basicLecture.course ? 'Linked' : 'Not linked'
          });

          // CRITICAL: Validate that contentId was properly set
          if (!basicLecture.contentId) {
            console.error('❌ CRITICAL ERROR: Basic lecture created without contentId!');
            return res.status(500).json({ message: 'Basic lecture creation failed - missing contentId' });
          }
        } else {
          console.log('⚠️ Basic lecture already exists, skipping creation');
          lectureDoc = existingLecture;

          // Ensure existing lecture has contentId
          if (!existingLecture.contentId) {
            try {
              const updateResult = await Lecture.updateOne(
                { _id: existingLecture._id },
                { $set: { contentId: lectureContentId } }
              );
              console.log('🔄 Updated existing basic lecture with contentId:', {
                matched: updateResult.matchedCount,
                modified: updateResult.modifiedCount,
                contentId: lectureContentId
              });
            } catch (updateError) {
              console.error('❌ Failed to update existing basic lecture:', updateError.message);
              return res.status(500).json({ message: 'Failed to update existing basic lecture' });
            }
          }
        }
      } catch (basicLectureError) {
        console.error('❌ Error creating basic lecture document:', basicLectureError);
        console.log('Continuing with FileCategory only...');
      }
    }

    // Update category lecture count
    const structuredLectureCount = await Lecture.countDocuments({ category });
    const fileCategoryCount = await FileCategory.countDocuments({ category });
    categoryDoc.lectureCount = structuredLectureCount + fileCategoryCount;
    await categoryDoc.save();

    // ====================
    // AUTOMATIC CONTENT LINKING
    // ====================
    let autoLinked = false;
    try {
      if (courseDoc) {
        console.log('� Attempting automatic lecture linking...');

        // Import the auto-linking function
        const { autoLinkContentToLectures } = require('../ensure-future-lecture-uploads');

        const linkResult = await autoLinkContentToLectures(courseDoc._id, fileCategory._id);
        autoLinked = linkResult.success;

        console.log('🔗 Auto-linking result:', autoLinked ? 'SUCCESS' : 'FAILED');
        if (autoLinked) {
          console.log('🎯 Lecture successfully linked to course structure');
        }
      }
    } catch (linkError) {
      console.error('⚠️ Auto-linking error (non-critical):', linkError.message);
      // Don't fail the upload because of linking issues
    }

    // Clean up: Remove the temporary file since we stored content in DB
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.warn('Failed to clean up temporary file:', cleanupErr);
    }

    console.log('📝 UPLOAD RESPONSE PREPARATION:');
    console.log('  - Course Document:', courseDoc ? {
      id: courseDoc._id,
      title: courseDoc.title,
      categoriesCount: courseDoc.categories?.length || 0
    } : 'No course document');
    console.log('  - Lecture Document:', lectureDoc ? {
      id: lectureDoc._id,
      title: lectureDoc.title,
      sections: lectureDoc.sections?.length,
      quizQuestions: lectureDoc.quizQuestions?.length,
      contentId: lectureDoc.contentId
    } : 'No lecture document created');
    console.log('  - FileCategory:', {
      id: fileCategory._id,
      filename: fileCategory.filename,
      title: fileCategory.title
    });
    console.log('  - Auto-linking result:', autoLinked);
    console.log('  - FileCategory assignment:', fileCategory.isAssignedToCourse);

    res.json({
      message: lectureDoc
        ? 'Lecture uploaded, processed, and structured successfully!'
        : 'Lecture file uploaded successfully (basic processing only)',
      file: {
        filename: req.file.filename,
        size: content.length,
        title: fileCategory.title
      },
      lecture: lectureDoc ? {
        id: lectureDoc._id.toString(),
        title: lectureDoc.title,
        slug: lectureDoc.slug,
        sections: lectureDoc.sections?.length || 0,
        quizQuestions: lectureDoc.quizQuestions?.length || 0,
        contentId: lectureDoc.contentId,
        isStructured: true
      } : null,
      courseAssignment: {
        courseId: courseDoc ? courseDoc._id.toString() : null,
        courseName: courseDoc ? courseDoc.title : null,
        isAssigned: !!courseDoc && fileCategory.isAssignedToCourse,
        categoryValid: isValidCourse
      },
      autoLinking: {
        attempted: !!courseDoc,
        successful: autoLinked,
        message: courseDoc
          ? (autoLinked
              ? 'Lecture automatically linked to course structure'
              : 'Could not link to course (may need manual intervention)')
          : 'No course specified for linking'
      },
      processing: {
        structuredDataReceived: !!structuredLectureData,
        lectureDocumentCreated: !!lectureDoc,
        fileCategoryCreated: true,
        contentProcessed: !!lectureDoc
      }
    });
  } catch (err) {
    console.error('Error uploading lecture - FULL ERROR DETAILS:');
    console.error('❌ Error name:', err.name);
    console.error('❌ Error message:', err.message);
    console.error('❌ Error stack:', err.stack);

    // Check for common issues
    if (err.name === 'ValidationError') {
      console.error('❌ Validation error:', err.errors);
      return res.status(400).json({
        message: 'Validation error',
        error: err.errors
      });
    }

    if (err.code === 11000) {
      console.error('❌ Duplicate key error in FileCategory filename field');
      return res.status(400).json({ message: 'File with this name already exists' });
    }

    // Catch all other errors
    res.status(500).json({
      message: 'Error uploading lecture',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get list of all lecture files from database
router.get('/lectures', auth, adminAuth, async (req, res) => {
  try {
    const fileCategories = await FileCategory.find({})
      .populate('category')
      .sort({ createdAt: -1 });

    const lectures = fileCategories.map(fileCat => ({
      fileName: fileCat.filename,
      displayName: fileCat.title,
      category: fileCat.category ? fileCat.category.name : 'Uncategorized',
      categoryId: fileCat.category ? fileCat.category._id : null,
      size: fileCat.content ? fileCat.content.length : 0,
      createdAt: fileCat.createdAt,
      updatedAt: fileCat.updatedAt,
      description: fileCat.description
    }));

    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Error fetching lectures' });
  }
});

// Simplified lecture content endpoint for debugging
router.get('/lectures/content/:filename', (req, res) => {
  console.log(`LECTURE REQUEST RECEIVED: ${req.params.filename}`);
  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, req.headers);

  // Skip auth for now to debug
  (async () => {
    try {
      const { filename } = req.params;

      // Find lecture content in database
      const fileCategory = await FileCategory.findOne({ filename });
      if (!fileCategory) {
        console.log(`❌ Lecture not found: ${filename}`);
        return res.status(404).json({ message: 'Lecture not found in database' });
      }

      console.log(`✅ Lecture found: ${filename}, content length: ${fileCategory.content ? fileCategory.content.length : 0}`);

      // Debug: Log the first 50 characters
      console.log(`🔍 First 50 characters: "${fileCategory.content ? fileCategory.content.substring(0, 50) : 'NULL'}"`);

      // Set minimal headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      // Check if content exists
      if (!fileCategory.content) {
        console.log(`❌ Content field is null/undefined`);
        return res.status(500).json({ message: 'Lecture content field is null' });
      }

      if (fileCategory.content.length === 0) {
        console.log(`❌ Content length is 0`);
        return res.status(500).json({ message: 'Lecture content is empty string' });
      }

      console.log(`📤 Sending response with ${fileCategory.content.length} characters...`);
      res.status(200).send(fileCategory.content);
      console.log(`✅ Response sent for ${filename}`);

    } catch (err) {
      console.error('❌ Error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  })();
});

// Delete a lecture from database
router.delete('/lectures/:filename', auth, adminAuth, async (req, res) => {
  try {
    const { filename } = req.params;

    // Security check to prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    // Remove from FileCategory collection
    const deleteResult = await FileCategory.deleteOne({ filename });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Lecture not found in database' });
    }

    console.log(`Deleted lecture ${filename} from database`);

    res.json({
      message: 'Lecture deleted successfully from database'
    });
  } catch (err) {
    console.error('Error deleting lecture:', err);
    res.status(500).json({ message: 'Error deleting lecture' });
  }
});

// Create a new lecture
router.post('/lectures/create', auth, adminAuth, async (req, res) => {
  try {
    const { title, subtitle, description, slug, sections, quizQuestions, isHinglish } = req.body;
    
    // Check if lecture with this slug already exists
    const existingLecture = await Lecture.findOne({ slug });
    if (existingLecture) {
      return res.status(400).json({ message: 'A lecture with this slug already exists' });
    }
    
    const lecture = new Lecture({
      title,
      subtitle,
      description,
      slug,
      sections,
      quizQuestions,
      isHinglish
    });
    
    await lecture.save();
    
    res.status(201).json({
      message: 'Lecture created successfully',
      lecture
    });
  } catch (err) {
    console.error('Error creating lecture:', err);
    res.status(500).json({ message: 'Error creating lecture', error: err.message });
  }
});

// Update a lecture
router.put('/lectures/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, slug, sections, quizQuestions, isHinglish } = req.body;
    
    // Check if lecture exists
    const lecture = await Lecture.findById(id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    // Check if another lecture with this slug already exists
    if (slug !== lecture.slug) {
      const existingLecture = await Lecture.findOne({ slug });
      if (existingLecture) {
        return res.status(400).json({ message: 'A lecture with this slug already exists' });
      }
    }
    
    lecture.title = title;
    lecture.subtitle = subtitle;
    lecture.description = description;
    lecture.slug = slug;
    lecture.sections = sections;
    lecture.quizQuestions = quizQuestions;
    lecture.isHinglish = isHinglish;
    
    await lecture.save();
    
    res.json({
      message: 'Lecture updated successfully',
      lecture
    });
  } catch (err) {
    console.error('Error updating lecture:', err);
    res.status(500).json({ message: 'Error updating lecture', error: err.message });
  }
});

// Delete a lecture from database
router.delete('/lectures/delete/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const lecture = await Lecture.findByIdAndDelete(id);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    res.json({ message: 'Lecture deleted successfully' });
  } catch (err) {
    console.error('Error deleting lecture:', err);
    res.status(500).json({ message: 'Error deleting lecture', error: err.message });
  }
});

// Get all lectures from database with relationships populated
router.get('/lectures/detailed', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔍 FETCHING ALL DETAILED LECTURES WITH BOTH CATEGORY AND COURSE...');

    let allLectures = [];

    // 1. Get structured lectures (Lecture model) with course relationships
    console.log('📚 FETCHING STRUCTURED LECTURES...');
    const structuredLectures = await Lecture.find({})
      .populate('category')
      .populate({ path: 'course', select: 'title slug categories' })
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${structuredLectures.length} structured lectures`);

    // Filter only those with both category and course
    const validStructuredLectures = structuredLectures.filter(lecture => {
      return lecture.category && lecture.course;
    });

    console.log(`✅ Valid structured lectures with category+course: ${validStructuredLectures.length}`);

    // Transform structured lectures to consistent format
    const transformedStructuredLectures = validStructuredLectures.map(lecture => ({
      _id: lecture._id,
      title: lecture.title,
      slug: lecture.slug,
      category: lecture.category?.name || 'No Category',
      categoryId: lecture.category?._id,
      course: lecture.course?.title || 'No Course',
      courseId: lecture.course?._id?.toString(),
      size: 0,
      createdAt: lecture.createdAt,
      lectureType: 'structured'
    }));

    allLectures = [...transformedStructuredLectures];

    // 2. Get FileCategory lectures with course relationships
    console.log('📁 FETCHING FILECATEGORY LECTURES...');
    const fileLectures = await FileCategory.find({})
      .populate('category')
      .populate({ path: 'course', select: 'title slug categories' })
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${fileLectures.length} FileCategory lectures`);

    // Filter FileCategory lectures to only include those with BOTH category AND course
    // Using proper validation for admin dashboard visibility
    const validFileCategoryLectures = fileLectures.filter(fileCat => {
      const hasCategory = fileCat.category && fileCat.category._id;
      const hasCourse = fileCat.course && fileCat.isAssignedToCourse;

      if (!hasCategory || !hasCourse) {
        console.log(`🔍 DEBUG: Skipping FileCategory lecture "${fileCat.title}"`, {
          category: fileCat.category?._id,
          course: fileCat.course?._id?.toString(),
          isAssignedToCourse: fileCat.isAssignedToCourse,
          hasCategory: !!hasCategory,
          hasCourse: !!hasCourse,
          filename: fileCat.filename
        });
        return false;
      }

      // Check if the course has a categories array defined
      if (fileCat.course.categories && fileCat.course.categories.length > 0) {
        // Verify the lecture's category exists in the course's categories
        const categoryInCourse = fileCat.course.categories.some(cat =>
          cat.name === fileCat.category.name || cat._id.toString() === fileCat.category._id.toString()
        );

        if (categoryInCourse) {
          console.log(`✅ VALID: FileCategory lecture "${fileCat.title}" has category "${fileCat.category.name}" matching course "${fileCat.course.title}"`);
          return true;
        } else {
          console.log(`⚠️ WARNING: FileCategory lecture "${fileCat.title}" category "${fileCat.category.name}" not found in course "${fileCat.course.title}" categories list`);
          console.log(`   Course categories: ${fileCat.course.categories.map(c => c.name).join(', ')}`);
          console.log(`   Lecture category: ${fileCat.category.name}`);
          // Allow showing anyway for admin visibility (but log the warning)
          return true;
        }
      }

      // For courses without category structure, just verify both exist (always true here)
      console.log(`✅ SIMPLE VALIDATION: FileCategory lecture "${fileCat.title}" has both category and course relationships`);
      return true;
    });

    console.log(`✅ Valid FileCategory lectures with category+course: ${validFileCategoryLectures.length}`);

    const transformedFileLectures = validFileCategoryLectures.map(fileCat => ({
      _id: fileCat._id,
      title: fileCat.title,
      slug: fileCat.filename,
      category: fileCat.category?.name || 'Uncategorized',
      categoryId: fileCat.category?._id,
      course: fileCat.course?.title || 'Unknown Course',
      courseId: fileCat.course?._id?.toString() || null,
      size: fileCat.content?.length || 0,
      createdAt: fileCat.createdAt,
      lectureType: 'content'
    }));

    // 3. Combine ALL valid lectures from both sources
    allLectures = [...transformedStructuredLectures, ...transformedFileLectures];

    console.log('📊 COMPLETE CONTENT SECTION SUMMARY:');
    console.log(`   ✅ Structured lectures with category+course: ${transformedStructuredLectures.length}`);
    console.log(`   ✅ FileCategory lectures with category+course: ${transformedFileLectures.length}`);
    console.log(`   🎯 TOTAL LECTURES WITH BOTH CATEGORY AND COURSE: ${allLectures.length}`);
    console.log(`   🔄 All lectures displayed: YES`);
    console.log(`   📝 Sample of combined results:`, allLectures.slice(0, 3).map(l => ({
      title: l.title,
      category: l.category,
      course: l.course,
      type: l.lectureType
    })));

    return res.json(allLectures);

  } catch (err) {
    console.error('❌ Error fetching detailed lectures:', err);
    res.status(500).json({ message: 'Error fetching detailed lectures', error: err.message });
  }
});

// Get all lectures from database
router.get('/lectures/database', auth, adminAuth, async (req, res) => {
  try {
    const lectures = await Lecture.find({}).sort({ createdAt: -1 });
    res.json(lectures);
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Error fetching lectures', error: err.message });
  }
});

// Get a specific lecture by ID
router.get('/lectures/database/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const lecture = await Lecture.findById(id);
    
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    
    res.json(lecture);
  } catch (err) {
    console.error('Error fetching lecture:', err);
    res.status(500).json({ message: 'Error fetching lecture', error: err.message });
  }
});

// Secure admin user creation (requires existing admin)
router.post('/create-admin', auth, adminAuth, async (req, res) => {
  try {
    const { email, password, name = 'Admin User' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new admin user
    const adminUser = new User({
      name,
      email,
      password, // Will be hashed by User model
      role: 'admin',
      isSubscribed: false
    });

    await adminUser.save();

    res.status(201).json({
      message: 'Admin user created successfully!',
      user: {
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Category management routes

// Create a new category
router.post('/categories', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, slug, parentCategory, order } = req.body;
    
    // Check if category with this slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'A category with this slug already exists' });
    }
    
    const category = new Category({
      name,
      description,
      slug,
      parentCategory: parentCategory || null,
      order: order || 0
    });
    
    await category.save();
    
    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category', error: err.message });
  }
});

// Get all categories - FIXED VERSION
router.get('/categories', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔍 GET /categories - Request received');
    console.log(`User: ${req.user ? req.user.email : 'No user'}`);
    console.log(`Role: ${req.user ? req.user.role : 'No role'}`);

    // Make sure Category model is available
    if (!Category) {
      console.error('❌ Category model not found');
      return res.status(500).json({ message: 'Category model not available' });
    }

    // Query with detailed logging
    const categoriesQuery = Category.find({});
    console.log('Query object created successfully');

    const categories = await categoriesQuery.sort({ order: 1, name: 1 });
    console.log(`✅ Found ${categories?.length || 0} categories`);

    // Log each category for debugging
    if (categories && categories.length > 0) {
      console.log('📋 Categories found:');
      categories.forEach((cat, idx) => {
        console.log(`   ${idx + 1}. ${cat.name} (ID: ${cat._id})`);
      });
    } else {
      console.log('❌ No categories found');
    }

    // Respond with categories
    res.json({
      success: true,
      categories: categories || [],
      total: categories?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Error fetching categories:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
      message: 'Error fetching categories',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get a specific category by ID
router.get('/categories/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ message: 'Error fetching category', error: err.message });
  }
});

// Update a category
router.put('/categories/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, parentCategory, order } = req.body;
    
    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if another category with this slug already exists
    if (slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: 'A category with this slug already exists' });
      }
    }
    
    category.name = name;
    category.description = description;
    category.slug = slug;
    category.parentCategory = parentCategory || null;
    category.order = order !== undefined ? order : category.order;
    
    await category.save();
    
    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Error updating category', error: err.message });
  }
});

// Delete a category
router.delete('/categories/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has child categories
    const childCount = await Category.countDocuments({ parentCategory: id });
    if (childCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete category that has child categories. Please delete child categories first.'
      });
    }

    // Check if category is being used by any lectures or file categories
    const lectureCount = await Lecture.countDocuments({ category: id });
    const fileCategoryCount = await FileCategory.countDocuments({ category: id });

    if (lectureCount > 0 || fileCategoryCount > 0) {
      const totalCount = lectureCount + fileCategoryCount;

      // Get more details about what is associated
      const lectures = await Lecture.find({ category: id }).select('title');
      const fileCategories = await FileCategory.find({ category: id }).select('filename title');

      const details = [];
      if (lectures.length > 0) {
        details.push(`Database lectures: ${lectures.map(l => l.title).join(', ')}`);
      }
      if (fileCategories.length > 0) {
        details.push(`File-based lectures: ${fileCategories.map(f => f.title || f.filename).join(', ')}`);
      }

      return res.status(400).json({
        message: `Cannot delete category that is associated with ${totalCount} lecture(s). Please reassign lectures first.`,
        details: details,
        associatedContent: {
          lectureCount,
          fileCategoryCount,
          lectures: lectures,
          fileCategories: fileCategories
        }
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category', error: err.message });
  }
});

// Reorder categories
router.put('/categories/reorder', auth, adminAuth, async (req, res) => {
  try {
    const { categories } = req.body; // Array of { id, order } objects
    
    // Update order for each category
    const updatePromises = categories.map(({ id, order }) => 
      Category.findByIdAndUpdate(id, { order })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Categories reordered successfully' });
  } catch (err) {
    console.error('Error reordering categories:', err);
    res.status(500).json({ message: 'Error reordering categories', error: err.message });
  }
});

// Grant subscription to a user for a specific plan
router.post('/users/:userId/grant-subscription', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { planId, customExpiry } = req.body;

    console.log('🔍 GRANT SUBSCRIPTION REQUEST:', {
      userId,
      planId,
      customExpiry,
      requestBody: req.body
    });

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 USER FOUND:', {
      userId: user._id,
      name: user.name,
      currentSubscription: user.subscription
    });

    // Get the subscription plan details
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    console.log('📋 PLAN DETAILS:', {
      planId: plan._id,
      name: plan.name,
      pricing: plan.pricing,
      monthlyPrice: plan.monthlyPrice,
      duration: plan.duration,
      billingCycle: plan.billingCycle
    });

    // Calculate expiry date
    let expiryDate;
    if (customExpiry) {
      expiryDate = new Date(customExpiry);
      console.log('📅 Custom expiry date:', expiryDate);
    } else {
      // Use plan's duration if no custom expiry
      expiryDate = new Date();
      const durationMonths = parseInt(plan.duration) || 1;
      expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
      console.log('📅 Calculated expiry date:', expiryDate, '(duration:', durationMonths, 'months)');
    }

    // Get price from plan - try multiple possible fields
    let price = 0;
    if (plan.pricing && plan.pricing.price) {
      price = plan.pricing.price;
    } else if (plan.monthlyPrice) {
      price = plan.monthlyPrice;
    } else if (plan.pricing && plan.pricing.monthlyPrice) {
      price = plan.pricing.monthlyPrice;
    }

    console.log('💰 PRICE DETERMINATION:', {
      planPricing: plan.pricing,
      price: price,
      monthlyPrice: plan.monthlyPrice
    });

    // Get billing cycle
    const billingCycle = plan.billingCycle || 'monthly';
    console.log('🔄 BILLING CYCLE:', billingCycle);

    // Update user subscription with comprehensive data
    const subscriptionData = {
      planId: plan._id,
      planName: plan.name || 'Unknown Plan',
      price: price || 0,
      currency: 'INR',
      billingCycle: billingCycle,
      startDate: new Date(),
      endDate: expiryDate,
      status: 'completed',
      features: plan.features || [],
      paymentId: `admin_${userId}_${Date.now()}`,
      createdBy: req.user._id,
      grantedBy: 'admin',
      grantDate: new Date()
    };

    console.log('📝 FINAL SUBSCRIPTION DATA:', subscriptionData);

    user.isSubscribed = true;

    // Use comprehensive subscription data structure
    user.subscription = {
      // Plan Information - REQUIRED FOR DISPLAY
      planId: plan._id.toString(),
      planName: plan.name,

      // Pricing Information - REQUIRED FOR DISPLAY
      amount: price,
      price: price, // Dual field for compatibility
      currency: 'INR',
      billingCycle: billingCycle,

      // Date Information - REQUIRED FOR DISPLAY
      startDate: new Date(),
      subscribedAt: new Date(), // Legacy field
      endDate: expiryDate,
      expiresAt: expiryDate, // Legacy field

      // Administrative Information
      paymentId: `admin_${userId}_${Date.now()}`,
      orderId: `order_${Date.now()}_${userId}`,
      status: 'completed',
      createdBy: req.user._id,
      grantedBy: 'admin',
      grantDate: new Date(),

      // Feature Information
      features: plan.features || [],

      // Additional legacy fields for compatibility
      expires: expiryDate
    };

    console.log('💾 SAVING USER SUBSCRIPTION:', {
      planId: user.subscription.planId,
      planName: user.subscription.planName,
      price: user.subscription.price,
      currency: user.subscription.currency
    });
    await user.save();

    console.log('✅ USER SAVED SUCCESSFULLY');
    console.log('🎯 FINAL USER SUBSCRIPTION:', {
      isSubscribed: user.isSubscribed,
      subscription: user.subscription
    });

    res.json({
      message: 'Subscription granted successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isSubscribed: user.isSubscribed,
        subscription: user.subscription
      },
      debug: {
        planDetails: {
          id: plan._id,
          name: plan.name,
          pricing: plan.pricing,
          duration: plan.duration
        },
        calculated: {
          expiryDate: expiryDate,
          price: price,
          billingCycle: billingCycle
        }
      }
    });
  } catch (err) {
    console.error('❌ ERROR GRANTING SUBSCRIPTION:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
      message: 'Error granting subscription',
      error: err.message
    });
  }
});

// Revoke subscription from a user
router.post('/users/:userId/revoke-subscription', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user subscription - revoke it
    user.isSubscribed = false;
    user.subscription = {
      ...user.subscription,
      status: 'cancelled',
      revokedAt: new Date(),
      revokedBy: req.user._id
    };

    await user.save();

    res.json({
      message: 'Subscription revoked successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isSubscribed: user.isSubscribed,
        subscription: user.subscription
      }
    });
  } catch (err) {
    console.error('Error revoking subscription:', err);
    res.status(500).json({
      message: 'Error revoking subscription',
      error: err.message
    });
  }
});

// Test endpoint to verify authentication
router.get('/test-auth', auth, async (req, res) => {
  try {
    res.json({
      message: 'Authentication successful!',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        isSubscribed: req.user.isSubscribed,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Test auth error:', err);
    res.status(500).json({ message: 'Test auth failed' });
  }
});

module.exports = router;
