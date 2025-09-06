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
    const { amount, currency = 'INR' } = req.body;

    // Create order options
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_order_${Date.now()}`,
      payment_capture: 1
    };

    console.log('Creating Razorpay order with options:', options);
    console.log('Razorpay key_id:', process.env.RAZORPAY_KEY_ID);
    console.log('Razorpay key_secret:', process.env.RAZORPAY_KEY_SECRET ? '[REDACTED]' : 'NOT SET');

    // Create order
    const order = await razorpay.orders.create(options);
    
    console.log('Razorpay order created:', order);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });
  } catch (err) {
    console.error('Order creation error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      description: err.description
    });
    res.status(500).json({ message: 'Error creating payment order' });
  }
});

// Verify payment
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify payment signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update user subscription status
    const user = await User.findById(req.user._id);
    
    // Get order details to retrieve amount
    const order = await razorpay.orders.fetch(razorpay_order_id);
    
    user.isSubscribed = true;
    user.subscription = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: order.amount / 100, // Convert back to rupees
      currency: order.currency,
      status: 'completed',
      subscribedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    await user.save();

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
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ message: 'Error verifying payment' });
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
