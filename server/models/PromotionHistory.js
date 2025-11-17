const mongoose = require('mongoose');

const promotionHistorySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  newClassId: {
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
    required: true
  },
  promotedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  promotionDate: {
    type: Date,
    default: Date.now
  },
  rolledBack: {
    type: Boolean,
    default: false
  },
  rollbackDate: Date,
  rolledBackBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PromotionHistory', promotionHistorySchema);