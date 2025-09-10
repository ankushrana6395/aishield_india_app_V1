const express = require('express');
const Razorpay = require('razorpay');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
router.post('/order', auth, async (req, res) => {
  try {
    const { amount, currency = 'INR', planId } = req.body;

    let finalAmount = amount;
    let orderCurrency = currency;

    console.log('🔄 Order creation request:', { amount, currency, planId, userEmail: req.user?.email });

    // Basic validation
    if (typeof finalAmount !== 'number' || finalAmount <= 0) {
      console.error('❌ Invalid amount:', finalAmount);
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    console.log('📋 Razorpay keys check:', {
      keyId: process.env.RAZORPAY_KEY_ID ? '[SET]' : '[NOT SET]',
      keySecret: process.env.RAZORPAY_KEY_SECRET ? '[REDACTED]' : '[NOT SET]'
    });

    // Check Razorpay instance
    if (!razorpay) {
      console.error('❌ Razorpay instance not initialized');
      return res.status(500).json({ message: 'Payment gateway not configured on server' });
    }

    // If planId is provided, fetch plan details and use plan-specific pricing
    if (planId) {
      console.log('📋 PlanId provided, fetching plan details for pricing');

      const SubscriptionPlan = require('../models/SubscriptionPlan');

      try {
        const plan = await SubscriptionPlan.findById(planId);

        if (plan) {
          console.log('✅ Plan found:', {
            name: plan.name,
            pricing: plan.pricing,
            published: plan.business?.isActive && plan.business?.isVisible
          });

          // Verify plan is published
          const isPublished = plan.business?.isActive && plan.business?.isVisible || plan.published;
          if (!isPublished) {
            console.error('❌ Plan not published:', planId);
            return res.status(400).json({ message: 'This subscription plan is not available' });
          }

          // Use plan-specific pricing
          if (plan.pricing?.price) {
            finalAmount = plan.pricing.price;
            orderCurrency = plan.pricing.currency || 'INR';
            console.log('💰 Using plan-specific pricing:', { finalAmount, orderCurrency });
          } else {
            console.warn('⚠️ Plan has no pricing, using provided amount');
          }
        } else {
          console.error('❌ Subscription plan not found:', planId);
          // Instead of returning error, continue with provided amount for testing
          console.warn('⚠️ Continuing with provided amount despite plan not found');
        }
      } catch (planError) {
        console.error('❌ Error fetching plan:', planError);
        // Don't fail the payment if we can't fetch the plan - use provided amount
        console.warn('⚠️ Plan fetch failed, using provided amount');
      }
    } else {
      console.log('⚠️ No planId provided, using provided amount');
    }

    // Validate amount again after potential plan lookup
    if (typeof finalAmount !== 'number' || finalAmount <= 0) {
      console.error('❌ Invalid amount after plan lookup:', finalAmount);
      return res.status(400).json({ message: 'Invalid payment amount after plan lookup' });
    }

    // Validate amount
    if (typeof finalAmount !== 'number' || finalAmount <= 0) {
      console.error('❌ Invalid amount:', finalAmount);
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Create order options
    const options = {
      amount: finalAmount * 100, // Razorpay expects amount in paise
      currency: orderCurrency.toUpperCase(),
      receipt: `receipt_order_${Date.now()}_${req.user._id}`,
      payment_capture: 1
    };

    console.log('📝 Creating Razorpay order with final options:', {
      ...options,
      amountInRupees: finalAmount,
      planId
    });

    console.log('Razorpay config:', {
      key_id: process.env.RAZORPAY_KEY_ID ? '[SET]' : 'NOT SET',
      key_secret: process.env.RAZORPAY_KEY_SECRET ? '[REDACTED]' : 'NOT SET'
    });

    // Create order
    const order = await razorpay.orders.create(options);

    console.log('✅ Razorpay order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      planId: planId // Return planId for verification
    });
  } catch (err) {
    console.error('❌ Order creation error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      description: err.description,
      stack: err.stack
    });
    res.status(500).json({
      message: 'Error creating payment order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Verify payment with subscription plan assignment
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Verify payment signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    console.log('🎉 Payment verified successfully for user:', req.user.email);

    // If planId is provided, assign the subscription plan
    if (planId) {
      console.log('📋 Plan ID provided, assigning subscription plan:', planId);

      const SubscriptionPlan = require('../models/SubscriptionPlan');
      const user = await User.findById(req.user._id);
      const plan = await SubscriptionPlan.findById(planId);

      if (!plan) {
        console.error('❌ Subscription plan not found:', planId);
        return res.status(404).json({ message: 'Subscription plan not found' });
      }

      console.log('✅ Plan found:', plan.name, 'Published:', plan.published);

      // Check if plan is published
      if (!plan.published) {
        return res.status(400).json({ message: 'This subscription plan is not currently available' });
      }

      // Calculate expiry date based on plan's billing cycle
      const startDate = new Date();
      let expiryDate;

      if (plan.billing && plan.billing.billingCycle) {
        const cycle = plan.billing.billingCycle;
        if (cycle === 'yearly') {
          expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
        } else if (cycle === 'quarterly') {
          expiryDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
        } else {
          expiryDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
        }
      } else {
        expiryDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
      }

      // Get price from plan
      const price = plan.pricing?.price || plan.monthlyPrice || 0;

      // Create comprehensive subscription data matching subscription-plans structure
      const subscriptionData = {
        planId: plan._id,
        planName: plan.name,
        price: price,
        currency: 'INR',
        billingCycle: plan.billing?.billingCycle || 'monthly',
        startDate: startDate,
        endDate: expiryDate,
        status: 'completed',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        features: plan.features || [],
        coursesIncluded: plan.includedCourses?.map(courseAccess => courseAccess.courseId) || [],
        createdBy: 'payment-gateway',
        grantedBy: 'payment',
        grantDate: startDate
      };

      console.log('📝 Creating subscription with data:', {
        planName: plan.name,
        price: price,
        billingCycle: subscriptionData.billingCycle,
        startDate: startDate.toISOString(),
        endDate: expiryDate.toISOString()
      });

      user.isSubscribed = true;
      user.subscription = subscriptionData;

      await user.save();

      // Add user to plan's subscribers list (if not using analytics with separate collection)
      // This is optional since we can calculate from user subscriptions
      try {
        await SubscriptionPlan.updateOne(
          { _id: planId },
          {
            $addToSet: { subscribers: req.user._id },
            $inc: { subscriberCount: 1, totalRevenue: price }
          }
        );
        console.log('✅ Updated plan subscriber count');
      } catch (planUpdateError) {
        console.warn('⚠️ Could not update plan statistics:', planUpdateError.message);
      }

      console.log('✅ Subscription assigned successfully to user:', user.name);

      res.json({
        success: true,
        message: 'Payment verified and subscription plan assigned successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscription: user.subscription
        },
        plan: {
          _id: plan._id,
          name: plan.name,
          description: plan.description,
          includedCourses: plan.includedCourses?.length || 0
        }
      });

    } else {
      // Fallback: Create basic subscription without plan assignment
      console.log('⚠️ No planId provided, creating basic subscription');

      const user = await User.findById(req.user._id);
      const order = await razorpay.orders.fetch(razorpay_order_id);

      user.isSubscribed = true;
      user.subscription = {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: order.amount / 100,
        currency: order.currency,
        status: 'completed',
        subscribedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: 'payment-gateway'
      };

      await user.save();

      console.log('✅ Basic subscription created for user:', user.name);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscription: user.subscription
        }
      });
    }
  } catch (err) {
    console.error('❌ Payment verification error:', err);
    res.status(500).json({
      message: 'Error verifying payment',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get subscription status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      isSubscribed: user.isSubscribed,
      subscription: user.subscription
    });
  } catch (err) {
    console.error('Subscription status error:', err);
    res.status(500).json({ message: 'Error fetching subscription status' });
  }
});

module.exports = router;
