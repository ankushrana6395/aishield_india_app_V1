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

    // Check password
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
    // Successful authentication, generate JWT and redirect to client
    const token = generateToken(req.user._id);
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/?token=${token}`;
    res.redirect(redirectUrl);
  }
);

// NOTE: Temporary admin creation route has been removed for security
// Only existing admins can create new admin users through secure routes

module.exports = router;
