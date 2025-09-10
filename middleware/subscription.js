const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const subscription = async (req, res, next) => {
  try {
    console.log('🔐 SubscriptionMiddleware - Check initiated');

    // Check if user is authenticated
    if (!req.user) {
      console.log('❌ SubscriptionMiddleware - No user authentication');
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('👤 SubscriptionMiddleware - User authenticated:', req.user.email);

    // Check if user is admin (admins have access to all content)
    if (req.user.role === 'admin') {
      console.log('✅ SubscriptionMiddleware - Admin access granted');
      return next();
    }

    // Check if user has an active subscription
    if (!req.user.isSubscribed || !req.user.subscription) {
      console.log('❌ SubscriptionMiddleware - No active subscription');
      return res.status(403).json({ message: 'Subscription required to access this content' });
    }

    console.log('📋 SubscriptionMiddleware - User has subscription:', {
      status: req.user.subscription.status,
      planName: req.user.subscription.planName,
      endDate: req.user.subscription.endDate
    });

    // Check subscription status
    if (req.user.subscription.status !== 'completed') {
      console.log('❌ SubscriptionMiddleware - Subscription not completed');
      return res.status(403).json({ message: 'Active subscription required to access this content' });
    }

    // Check if subscription has expired
    if (req.user.subscription.endDate && new Date() > new Date(req.user.subscription.endDate)) {
      console.log('❌ SubscriptionMiddleware - Subscription has expired');
      return res.status(403).json({ message: 'Subscription has expired' });
    }

    // For course-specific access, check if the course is included in the user's plan
    if (req.params.courseId) {
      console.log('🎓 SubscriptionMiddleware - Course-specific check for:', req.params.courseId);

      const courseId = req.params.courseId;

      // Early exit if no planId in subscription
      if (!req.user.subscription || !req.user.subscription.planId) {
        console.log('⚠️ SubscriptionMiddleware - No planId in subscription, denying access');
        return res.status(403).json({ message: 'Invalid subscription configuration. Please contact support.' });
      }

      try {
        // Fetch the plan to check course access
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        console.log('📋 SubscriptionMiddleware - Fetching plan for ID:', req.user.subscription.planId);

        const plan = await SubscriptionPlan.findById(req.user.subscription.planId)
          .select('includedCourses')
          .lean();

        if (!plan) {
          console.log('❌ SubscriptionMiddleware - Plan not found in database');
          return res.status(403).json({
            message: 'Subscription plan not found. Please contact support.',
            reason: 'PLAN_NOT_FOUND'
          });
        }

        // Check if course is in user's subscription plan
        const hasAccess = plan.includedCourses && plan.includedCourses.some(
          course => course.courseId.toString() === courseId);

        if (!hasAccess) {
          console.log('❌ SubscriptionMiddleware - Course not included in plan:', courseId);
          console.log('📋 Plan includes courses:', Object.values(plan.includedCourses).map(c => c.courseId.toString()));
          return res.status(403).json({
            message: 'This course is not included in your subscription plan',
            reason: 'COURSE_NOT_IN_PLAN',
            plan: req.user.subscription.planName
          });
        }

        console.log('✅ SubscriptionMiddleware - Course access granted');
        // Attach plan data for potential use in the route
        req.planData = plan;

      } catch (error) {
        console.error('💥 SubscriptionMiddleware - Error checking course access:', error);
        return res.status(500).json({
          message: 'Error validating course access. Please try again.',
          reason: 'VALIDATION_ERROR'
        });
      }
    }

    // User has valid subscription and meets all criteria
    console.log('✅ SubscriptionMiddleware - Access granted');
    next();
  } catch (err) {
    console.error('❌ SubscriptionMiddleware - Error:', err);
    res.status(500).json({ message: 'Server error during subscription check' });
  }
};

module.exports = subscription;
