const mongoose = require('mongoose');

const fileCategorySchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  content: {
    type: String, // Store HTML content as string
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false // Optional course assignment
  },
  instructor: {
    type: String,
    trim: true,
    default: 'Admin'
  },
  isAssignedToCourse: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // Disable unnecessary features
  versionKey: false,
  minimize: false
});

// Add index for performance
fileCategorySchema.index({ filename: 1 });

module.exports = mongoose.model('FileCategory', fileCategorySchema);
