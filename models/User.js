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
    // Plan Information
    planId: String,
    planName: String,

    // Pricing Information
    amount: Number,
    currency: String,

    // Billing Details
    billingCycle: String,

    // Payment Information
    paymentId: String,
    orderId: String,

    // Timing Information
    subscribedAt: Date,
    startDate: Date,
    expiresAt: Date,
    expiryDate: Date,

    // Administrative Information
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'suspended'],
      default: 'pending'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grantedBy: String,
    grantDate: Date,

    // Feature Access
    features: [String]
  },
  enrolledCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    enrolledDate: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessed: Date,
    completedDate: Date,
    certificateEarned: {
      type: Boolean,
      default: false
    },
    categoryProgress: [{
      categoryId: String,
      categoryName: String,
      progress: Number,
      totalLectures: Number,
      completedLectures: Number,
      lectureProgress: [{
        lectureId: String,
        lectureTitle: String,
        completed: Boolean,
        lastAccessed: Date
      }]
    }]
  }],
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
