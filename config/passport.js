/**
 * Passport.js Authentication Configuration
 *
 * Enterprise-grade authentication strategies for the AI Shield Learning Platform
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./environment');

// Serialize and deserialize user functions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // If you implement user model, replace this with actual database lookup
    // For now, keeping it simple for Render deployment
    done(null, { id, _id: id });
  } catch (error) {
    done(error, null);
  }
});

// Import User model
const User = require('../models/User');

// Google OAuth Strategy Configuration
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  console.log('🔐 GOOGLE OAUTH: Strategy configured');

  passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔐 GOOGLE OAUTH: Processing profile for:', profile.displayName);

      // Find user by Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Find user by email if Google ID not found
        const email = profile.emails ? profile.emails[0].value : null;
        if (email) {
          user = await User.findOne({ email });
        }

        if (!user) {
          // Create new user
          console.log('🔐 GOOGLE OAUTH: Creating new user');
          user = new User({
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            role: 'user',
            isSubscribed: false
          });
          await user.save();
          console.log('✅ GOOGLE OAUTH: New user created:', user.email);
        } else {
          // Update existing user with Google ID
          console.log('🔐 GOOGLE OAUTH: Updating existing user with Google ID');
          user.googleId = profile.id;
          await user.save();
        }
      } else {
        console.log('🔐 GOOGLE OAUTH: Found existing user:', user.email);
      }

      // Return user for JWT generation
      return done(null, user);
    } catch (error) {
      console.error('❌ GOOGLE OAUTH: Error processing user:', error);
      return done(error, null);
    }
  }));
} else {
  console.log('⚠️  GOOGLE OAUTH: Credentials not configured, OAuth disabled');
}

// Local Strategy for basic username/password if needed
// const LocalStrategy = require('passport-local').Strategy;
// passport.use(new LocalStrategy({
//   // Your local strategy configuration here
// }));

// JWT Strategy if you're using JWT tokens
// const JwtStrategy = require('passport-jwt').Strategy;
// const ExtractJwt = require('passport-jwt').ExtractJwt;

// If you're not using OAuth, you can use this simpler implementation
if (!config.GOOGLE_CLIENT_ID) {
  console.log('⚠️  No OAuth configured - using minimal passport setup');

  // Minimal strategy for development/testing
  passport.use('anonymous', {
    authenticate: function(req) {
      // Allow anonymous access for development
      return this.success({ id: 'anonymous', anonymous: true });
    }
  });
}

module.exports = passport;