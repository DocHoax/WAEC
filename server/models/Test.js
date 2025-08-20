const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true,
    enum: ['Continuous Assessment 1 (CA 1)', 'Continuous Assessment 2 (CA 2)', 'Examination'],
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
  },
  session: {
    type: String,
    required: [true, 'Session is required'],
    trim: true,
    enum: ['2025/2026 First Term', '2025/2026 Second Term', '2025/2026 Third Term', '2026/2027 First Term'],
  },
  instructions: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be a positive number'],
  },
  questionCount: {
    type: Number,
    required: [true, 'Question count is required'],
    min: [1, 'Question count must be a positive number'],
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks are required'],
    min: [1, 'Total marks must be a positive number'],
  },
  randomize: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed'],
    default: 'draft',
  },
  batches: [{
    name: { type: String, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    schedule: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  questionMarks: [{
    type: Number,
    min: [1, 'Question mark must be a positive number'],
  }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Add virtual for checking if test is active
TestSchema.virtual('isActive').get(function() {
  if (this.status !== 'scheduled') return false;
  const now = new Date();
  return this.batches.some(batch => 
    now >= new Date(batch.schedule.start) && now <= new Date(batch.schedule.end)
  );
});

module.exports = mongoose.model('Test', TestSchema);