const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true,
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