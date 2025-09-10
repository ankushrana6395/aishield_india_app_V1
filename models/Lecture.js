const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false // Allow lectures without courses initially
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sections: [{
    title: {
      type: String,
      required: true
    },
    content: [{
      heading: {
        type: String,
        required: true
      },
      paragraphs: [String],
      paragraphsHi: [String],
      list: [String],
      listHi: [String]
    }]
  }],
  quizQuestions: [{
    question: {
      en: { type: String, required: true },
      hi: { type: String, required: true }
    },
    options: {
      en: [{ type: String, required: true }],
      hi: [{ type: String, required: true }]
    },
    correctAnswer: {
      type: Number,
      required: true
    }
  }],
  isHinglish: {
    type: Boolean,
    default: false
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
lectureSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lecture', lectureSchema);
