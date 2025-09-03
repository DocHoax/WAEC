const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  session: {
    type: String,
    required: true
  },
  term: {
    type: String,
    required: true,
    enum: ['First', 'Second', 'Third']
  },
  grades: [{
    subject: String,
    score: Number,
    grade: String,
    remark: String
  }],
  totalScore: Number,
  average: Number,
  position: String,
  promoted: {
    type: Boolean,
    default: false
  },
  promotionDate: Date,
  created: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
academicRecordSchema.index({ studentId: 1, session: 1, term: 1 });

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);