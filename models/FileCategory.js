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
    type: mongoose.Schema.Types.Buffer, // Store as Buffer to avoid string conversion issues
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
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
