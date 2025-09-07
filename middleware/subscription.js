const User = require('../models/User');

const subscription = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is admin (admins have access to all content)
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has an active subscription
    if (!req.user.isSubscribed || !req.user.subscription) {
      return res.status(403).json({ message: 'Subscription required to access this content' });
    }

    // Check subscription status
    if (req.user.subscription.status !== 'completed') {
      return res.status(403).json({ message: 'Active subscription required to access this content' });
    }

    // Check if subscription has expired
    if (req.user.subscription.expiresAt && new Date() > req.user.subscription.expiresAt) {
      return res.status(403).json({ message: 'Subscription has expired' });
    }
    
    // User has valid subscription
    next();
  } catch (err) {
    console.error('Subscription check error:', err);
    res.status(500).json({ message: 'Server error during subscription check' });
  }
};

module.exports = subscription;
