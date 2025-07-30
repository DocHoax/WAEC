const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    required: true,
  },
  session: {
    type: String,
    required: true,
    default: '2025/2026 Semester 1',
  },
  answers: {
    type: Map,
    of: String,
    required: true,
  },
  correctness: {
    type: Map,
    of: Boolean,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

resultSchema.index({ userId: 1, subject: 1, class: 1, session: 1 });

module.exports = mongoose.model('Result', resultSchema);