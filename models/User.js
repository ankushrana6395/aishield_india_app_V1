const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Password is not required for Google OAuth users
      return !this.googleId;
    },
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isSubscribed: {
    type: Boolean,
    default: false
  },
  subscription: {
    paymentId: String,
    orderId: String,
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    subscribedAt: Date,
    expiresAt: Date
  },
  lectureProgress: [{
    lectureName: String,
    completed: {
      type: Boolean,
      default: false
    },
    lastAccessed: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving (only for password-based auth)
userSchema.pre('save', async function (next) {
  // Only hash the password if it's modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  // Don't hash password for Google OAuth users
  if (this.googleId) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
