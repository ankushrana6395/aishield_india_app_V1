const mongoose = require('mongoose');

const LectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: false, // Allow null values
    sparse: true,    // Don't require unique constraints for null values
    unique: false,   // Remove unique constraint entirely
    lowercase: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileCategory',
    required: false, // Allow null content ID for now
    sparse: true    // Sparse index for optional field
  },
  order: {
    type: Number,
    required: false,
    default: 0
  },
  duration: {
    type: Number, // Duration in minutes
    required: false,
    min: 0
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  isRequired: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  lectures: [LectureSchema],
  estimatedDuration: {
    type: Number, // Total duration in minutes
    default: 0
  }
}, { _id: true });

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/ // Only lowercase letters, numbers, and hyphens
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000 // Limit description length
  },
  shortDescription: {
    type: String,
    maxlength: 300,
    trim: true
  },
  instructor: {
    type: String,
    required: true,
    trim: true
  },
  instructorBio: {
    type: String,
    maxlength: 1000
  },
  thumbnail: {
    type: String, // URL to thumbnail image
    default: ''
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner'
  },
  duration: {
    type: Number, // Total estimated duration in minutes
    required: true,
    min: 0
  },

  // Content Structure
  categories: [CategorySchema],

  // Prerequisites and Learning Outcomes
  prerequisites: [{
    type: String,
    trim: true
  }],
  learningObjectives: [{
    type: String,
    trim: true
  }],
  skillsCovered: [{
    type: String,
    trim: true
  }],

  // Tags and Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  targetAudience: [{
    type: String,
    trim: true
  }],

  // Business Configuration
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  }, // For showing discounts
  isFree: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  published: {
    type: Boolean,
    default: false
  },

  // Analytics and Statistics
  enrollments: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Status and Scheduling
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft'
  },
  publishDate: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // SEO and Meta Information
  seoTitle: {
    type: String,
    maxlength: 60
  },
  seoDescription: {
    type: String,
    maxlength: 160
  },
  keywords: [{
    type: String,
    trim: true
  }]
});

// Indexes for performance
CourseSchema.index({ published: 1, createdAt: -1 });
CourseSchema.index({ slug: 1 });
CourseSchema.index({ tags: 1 });
CourseSchema.index({ difficulty: 1 });
CourseSchema.index({ featured: 1 });
CourseSchema.index({ tags: 1, difficulty: 1 });
CourseSchema.index({ createdBy: 1 });

// Pre-save middleware to update completion rates and calculate total duration
CourseSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Calculate total duration from categories
  if (this.categories && this.categories.length > 0) {
    this.duration = this.categories.reduce((total, category) => {
      return total + (category.estimatedDuration || 0);
    }, 0);
  }

  // Calculate completion rate based on enrollments and completions (if needed)
  if (this.enrollments > 0) {
    this.completionRate = this.completionRate || 0;
  }

  next();
});

// Method to get course progress for a user
CourseSchema.methods.getUserProgress = function(userId) {
  return this.model('User').findOne(
    { _id: userId, 'enrolledCourses.courseId': this._id },
    { 'enrolledCourses.$': 1 }
  ).then(user => {
    return user ? user.enrolledCourses[0] : null;
  });
};

// Method to enroll user in course
CourseSchema.methods.enrollUser = async function(userId) {
  const User = this.model('User');

  console.log('🏫 COURSE MODEL: enrollUser called');
  console.log('   - Course ID:', this._id);
  console.log('   - User ID:', userId);
  console.log('   - Course Title:', this.title);

  const enrollment = {
    courseId: this._id,
    courseName: this.title,
    enrolledDate: new Date(),
    progress: 0,
    lastAccessed: new Date(),
    certificateEarned: false,
    categoryProgress: this.categories.map(cat => ({
      categoryName: cat.name,
      completedLectures: 0,
      totalLectures: cat.lectures.length,
      progress: 0
    })),
    quizScores: []
  };

  console.log('🔧 ENROLLMENT OBJECT CREATED:', enrollment);

  try {
    // Add enrollment to user's enrolled courses
    const userUpdateResult = await User.updateOne(
      { _id: userId },
      {
        $addToSet: { enrolledCourses: enrollment }
      }
    );

    console.log('✅ USER UPDATE RESULT:', {
      matchedCount: userUpdateResult.matchedCount,
      modifiedCount: userUpdateResult.modifiedCount,
      acknowledged: userUpdateResult.acknowledged
    });

    if (userUpdateResult.matchedCount === 0) {
      throw new Error('User not found or enrollment update failed');
    }

  } catch (userUpdateError) {
    console.error('❌ USER ENROLLMENT UPDATE FAILED:', userUpdateError.message);
    throw new Error(`Failed to add enrollment to user account: ${userUpdateError.message}`);
  }

  try {
    // Increment course enrollment count
    const courseUpdateResult = await this.updateOne({ $inc: { enrollments: 1 } });

    console.log('✅ COURSE UPDATE RESULT:', {
      matchedCount: courseUpdateResult.matchedCount,
      modifiedCount: courseUpdateResult.modifiedCount,
      acknowledged: courseUpdateResult.acknowledged
    });

    if (courseUpdateResult.matchedCount === 0) {
      throw new Error('Course not found or enrollment increment failed');
    }

  } catch (courseUpdateError) {
    console.error('❌ COURSE ENROLLMENT INCREMENT FAILED:', courseUpdateError.message);

    // Try to rollback the user enrollment if course update failed
    try {
      await User.updateOne(
        { _id: userId },
        { $pull: { enrolledCourses: enrollment } }
      );
      console.log('⚠️  USER ENROLLMENT ROLLED BACK');
    } catch (rollbackError) {
      console.error('❌ ROLLBACK FAILED:', rollbackError.message);
    }

    throw new Error(`Failed to increment course enrollment count: ${courseUpdateError.message}`);
  }

  console.log('🎉 ENROLLMENT SUCCESSFUL!');
  return enrollment;
};

// Static method to get courses by difficulty
CourseSchema.statics.getByDifficulty = function(difficulty) {
  return this.find({
    published: true,
    difficulty: difficulty
  }).sort({ featured: -1, enrollments: -1 });
};

// Static method to get featured courses
CourseSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    published: true,
    featured: true
  })
  .sort({ enrollments: -1, createdAt: -1 })
  .limit(limit);
};

// Static method to search courses
CourseSchema.statics.search = function(query, options = {}) {
  const { limit = 20, skip = 0, filters = {} } = options;

  const searchQuery = {
    published: true,
    $text: { $search: query },
    ...filters
  };

  const searchStages = [
    { $match: searchQuery },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'instructorInfo'
      }
    },
    {
      $addFields: {
        score: { $meta: 'textScore' },
        instructor: { $arrayElemAt: ['$instructorInfo.name', 0] }
      }
    },
    {
      $project: {
        title: 1,
        slug: 1,
        description: 1,
        shortDescription: 1,
        instructor: 1,
        thumbnail: 1,
        difficulty: 1,
        duration: 1,
        enrollments: 1,
        rating: 1,
        featured: 1,
        score: 1,
        createdAt: 1
      }
    },
    { $sort: { score: -1, enrollments: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  return this.aggregate(searchStages);
};

// Virtual field for URL
CourseSchema.virtual('url').get(function() {
  return `/course/${this.slug}`;
});

// Virtual field for is popular
CourseSchema.virtual('isPopular').get(function() {
  return this.enrollments > 100 && this.rating.average > 4.0;
});

// Ensure virtual fields are serialized
CourseSchema.set('toJSON', { virtuals: true });
CourseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Course', CourseSchema);
