const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const passport = require('passport');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password
    });

    // Save user
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSubscribed: user.isSubscribed,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is OAuth-only (Google OAuth users without passwords)
    if (user.googleId && !user.password) {
      return res.status(400).json({
        message: 'This email is registered with Google. Please use Google sign-in instead.'
      });
    }

    // For password-based authentication, ensure password exists
    if (!user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password using bcrypt comparison
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSubscribed: user.isSubscribed,
      subscription: user.subscription,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if new email is already taken by another user
    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already taken by another user' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Delete user account
router.delete('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user
    await User.findByIdAndDelete(req.user._id);

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (err) {
    console.error('Profile delete error:', err);
    res.status(500).json({ message: 'Server error deleting account' });
  }
});

// Update user progress
router.put('/progress', auth, async (req, res) => {
  try {
    const { lectureName, completed } = req.body;
    const user = await User.findById(req.user._id);

    // Check if lecture progress already exists
    const existingProgressIndex = user.lectureProgress.findIndex(
      item => item.lectureName === lectureName
    );

    if (existingProgressIndex > -1) {
      // Update existing progress
      user.lectureProgress[existingProgressIndex].completed = completed;
      user.lectureProgress[existingProgressIndex].lastAccessed = new Date();
    } else {
      // Add new progress entry
      user.lectureProgress.push({
        lectureName,
        completed,
        lastAccessed: new Date()
      });
    }

    await user.save();
    res.json(user.lectureProgress);
  } catch (err) {
    console.error('Progress update error:', err);
    res.status(500).json({ message: 'Server error updating progress' });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Successful authentication, generate JWT and redirect to client
      console.log('✅ GOOGLE OAUTH: Authentication successful for user:', req.user.email);

      const token = generateToken(req.user._id);
      console.log('✅ GOOGLE OAUTH: JWT token generated for user ID:', req.user._id);

      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://aishield-india-app-v1.onrender.com'
        : (process.env.CLIENT_URL || 'http://localhost:3000');

      const redirectUrl = `${baseUrl}/?token=${token}`;
      console.log('🔄 GOOGLE OAUTH: Redirecting to:', redirectUrl);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ GOOGLE OAUTH: Callback error:', error);
      res.status(500).json({ message: 'OAuth callback failed', error: error.message });
    }
  }
);

// Debug endpoint for OAuth testing
router.get('/oauth-debug', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    client_url: process.env.CLIENT_URL,
    jwt_secret_exists: !!process.env.JWT_SECRET,
    google_client_id_exists: !!process.env.GOOGLE_CLIENT_ID,
    google_client_secret_exists: !!process.env.GOOGLE_CLIENT_SECRET,
    google_callback_url: process.env.GOOGLE_CALLBACK_URL
  });
});

// TEMPORARY ADMIN CREATION ROUTE REMOVED FOR SECURITY
// All admin creation must now go through secure admin dashboard
// or direct database manipulation by authorized administrators only

module.exports = router;
