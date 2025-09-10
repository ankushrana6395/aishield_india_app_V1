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

// Google OAuth Strategy Configuration
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Social login implementation
      // Replace with your user creation/authentication logic

      const user = {
        id: profile.id,
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails ? profile.emails[0].value : '',
        profilePic: profile.photos ? profile.photos[0].value : ''
      };

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
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