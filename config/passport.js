const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with the Google email
        let existingUser = await User.findOne({ email: profile.emails[0].value });

        if (existingUser) {
          // User exists, update Google ID if not set
          if (!existingUser.googleId) {
            existingUser.googleId = profile.id;
          }

          // Ensure admin role for specific email
          const userEmail = profile.emails[0].value;
          if (userEmail === 'ankushrana6395@gmail.com' && existingUser.role !== 'admin') {
            existingUser.role = 'admin';
          }

          await existingUser.save();
          return done(null, existingUser);
        }

        // Create new user if doesn't exist
        const userEmail = profile.emails[0].value;
        const isAdminUser = userEmail === 'ankushrana6395@gmail.com';

        const newUser = new User({
          name: profile.displayName,
          email: userEmail,
          googleId: profile.id,
          // Set a random password for Google users (they won't use it)
          password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          role: isAdminUser ? 'admin' : 'user', // Give admin role to specific email
          isSubscribed: false,
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
