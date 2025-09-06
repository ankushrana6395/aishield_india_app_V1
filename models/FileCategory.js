const mongoose = require('mongoose');

const fileCategorySchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
fileCategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create a unique index on filename
fileCategorySchema.index({ filename: 1 });

module.exports = mongoose.model('FileCategory', fileCategorySchema);
