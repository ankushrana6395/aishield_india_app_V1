const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    console.log('🔐 AUTH MIDDLEWARE: Checking authentication...');

    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      console.log('❌ AUTH FAILED: No authorization header found');
      return res.status(401).json({ message: 'No authorization header, access denied' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ AUTH FAILED: Header does not start with Bearer');
      return res.status(401).json({ message: 'Invalid authorization header format' });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 AUTH: Token extracted successfully');

    if (!token || token === '') {
      console.log('❌ AUTH FAILED: Empty token');
      return res.status(401).json({ message: 'Empty token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 AUTH: Token verified successfully:', {
      hasUserId: !!decoded.userId,
      has_id: !!decoded._id,
      tokenPayload: decoded
    });

    // Find user - try both possible formats
    let user;
    if (decoded.userId) {
      user = await User.findById(decoded.userId).select('-password');
      console.log('🔐 AUTH: Found user by userId:', user ? user.email : 'Not found');
    } else if (decoded._id) {
      user = await User.findById(decoded._id).select('-password');
      console.log('🔐 AUTH: Found user by _id:', user ? user.email : 'Not found');
    }

    if (!user) {
      console.log('❌ AUTH FAILED: User not found for token payload:', decoded);
      return res.status(401).json({ message: 'Token is not valid - user not found' });
    }

    // Check if user is admin for admin routes
    const url = req.originalUrl || req.url;
    if (url.includes('/admin/') && user.role !== 'admin') {
      console.log('❌ AUTH FAILED: User is not admin but accessing admin route');
      console.log('   User role:', user.role, 'User email:', user.email);
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    // Attach user to request object
    req.user = user;
    console.log('✅ AUTH SUCCESS: User authenticated:', user.email, '(' + user.role + ')');

    next();
  } catch (err) {
    console.error('❌ Authentication error:', err);
    console.error('   Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format' });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    } else {
      return res.status(401).json({ message: 'Token verification failed' });
    }
  }
};

module.exports = auth;
