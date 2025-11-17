const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    unique: true,
    match: [/^\d{4}\/\d{4} (First|Second|Third) Term$/, 'Session must be in format YYYY/YYYY First/Second/Third Term'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(date) {
        // Start date should be before end date if both exist
        return !this.endDate || date < this.endDate;
      },
      message: 'Start date must be before end date'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(date) {
        // End date should be after start date if both exist
        return !this.startDate || date > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, { 
  timestamps: true 
});

// Ensure only one session is active at a time
sessionSchema.pre('save', async function(next) {
  if (this.isActive && this.isModified('isActive')) {
    try {
      await this.constructor.updateMany(
        { 
          _id: { $ne: this._id }, 
          isActive: true 
        }, 
        { 
          isActive: false,
          updatedBy: this.updatedBy || this.createdBy
        }
      );
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get active session
sessionSchema.statics.getActiveSession = function() {
  return this.findOne({ isActive: true, isArchived: false });
};

// Static method to check if session name exists
sessionSchema.statics.sessionExists = function(sessionName, excludeId = null) {
  const query = { sessionName: sessionName.trim() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.findOne(query);
};

// Instance method to check if session can be deleted
sessionSchema.methods.canDelete = async function() {
  const AcademicRecord = mongoose.model('AcademicRecord');
  const Test = mongoose.model('Test');
  
  const [academicRecordsCount, testsCount] = await Promise.all([
    AcademicRecord.countDocuments({ session: this.sessionName }),
    Test.countDocuments({ session: this.sessionName })
  ]);
  
  return {
    canDelete: academicRecordsCount === 0 && testsCount === 0,
    dependencies: {
      academicRecords: academicRecordsCount,
      tests: testsCount
    }
  };
};

// Virtual for formatted display
sessionSchema.virtual('displayName').get(function() {
  return this.sessionName;
});

// Virtual for duration
sessionSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  }
  return 'Not specified';
});

// Ensure virtual fields are serialized
sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);