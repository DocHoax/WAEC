const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true,
    enum: {
      values: ['Continuous Assessment 1 (CA 1)', 'Continuous Assessment 2 (CA 2)', 'Examination'],
      message: 'Title must be Continuous Assessment 1 (CA 1), Continuous Assessment 2 (CA 2), or Examination'
    },
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    index: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required'],
    index: true
  },
  session: {
    type: String,
    required: [true, 'Session is required'],
    trim: true,
    match: [/^\d{4}\/\d{4} (First|Second|Third) Term$/, 'Session must be in format YYYY/YYYY First/Second/Third Term'],
    index: true
  },
  term: {
    type: String,
    required: [true, 'Term is required'],
    enum: {
      values: ['First Term', 'Second Term', 'Third Term'],
      message: 'Term must be First Term, Second Term, or Third Term'
    },
    index: true
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  questionCount: {
    type: Number,
    required: [true, 'Question count is required'],
    min: [1, 'Question count must be at least 1'],
    max: [200, 'Question count cannot exceed 200']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks are required'],
    min: [1, 'Total marks must be at least 1'],
    validate: {
      validator: function(totalMarks) {
        if (this.title.includes('CA') && totalMarks !== 20) {
          return false;
        }
        if (this.title === 'Examination' && totalMarks !== 60) {
          return false;
        }
        return true;
      },
      message: 'Continuous Assessments must have 20 marks, Examinations must have 60 marks'
    }
  },
  passingMarks: {
    type: Number,
    min: [0, 'Passing marks cannot be negative'],
    max: [this.totalMarks, 'Passing marks cannot exceed total marks'],
    default: function() {
      return Math.ceil(this.totalMarks * 0.4); // 40% by default
    }
  },
  randomize: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: false
  },
  allowRetakes: {
    type: Boolean,
    default: false
  },
  maxAttempts: {
    type: Number,
    min: [1, 'Maximum attempts must be at least 1'],
    default: 1
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'scheduled', 'active', 'completed', 'cancelled'],
      message: 'Status must be draft, scheduled, active, completed, or cancelled'
    },
    default: 'draft',
    index: true
  },
  batches: [{
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    schedule: {
      start: {
        type: Date,
        required: [true, 'Start time is required'],
        validate: {
          validator: function(start) {
            return start > new Date();
          },
          message: 'Start time must be in the future'
        }
      },
      end: {
        type: Date,
        required: [true, 'End time is required'],
        validate: {
          validator: function(end) {
            return end > this.schedule.start;
          },
          message: 'End time must be after start time'
        }
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }],
  questionMarks: [{
    type: Number,
    required: true,
    min: [1, 'Question mark must be at least 1'],
    validate: {
      validator: function(mark) {
        return mark <= 100;
      },
      message: 'Question mark cannot exceed 100'
    }
  }],
  settings: {
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    allowReview: {
      type: Boolean,
      default: false
    },
    timeLimitPerQuestion: {
      type: Number,
      min: [0, 'Time limit per question cannot be negative']
    },
    requireFullScreen: {
      type: Boolean,
      default: false
    },
    disableCopyPaste: {
      type: Boolean,
      default: false
    }
  },
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    lastAttempt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
testSchema.index({ subject: 1, class: 1, session: 1, term: 1 });
testSchema.index({ createdBy: 1, status: 1 });
testSchema.index({ 'batches.schedule.start': 1, 'batches.schedule.end': 1 });

// Virtual for active status
testSchema.virtual('isActive').get(function() {
  if (this.status !== 'scheduled') return false;
  const now = new Date();
  return this.batches.some(batch => 
    batch.isActive &&
    now >= new Date(batch.schedule.start) && 
    now <= new Date(batch.schedule.end)
  );
});

// Virtual for upcoming status
testSchema.virtual('isUpcoming').get(function() {
  if (this.status !== 'scheduled') return false;
  const now = new Date();
  return this.batches.some(batch => 
    batch.isActive &&
    now < new Date(batch.schedule.start)
  );
});

// Virtual for time remaining
testSchema.virtual('timeRemaining').get(function() {
  if (!this.isActive) return null;
  const now = new Date();
  const activeBatch = this.batches.find(batch => 
    batch.isActive &&
    now >= new Date(batch.schedule.start) && 
    now <= new Date(batch.schedule.end)
  );
  if (!activeBatch) return null;
  return new Date(activeBatch.schedule.end) - now;
});

// Pre-save validation
testSchema.pre('save', function(next) {
  // Validate question marks sum equals total marks
  if (this.questionMarks && this.questionMarks.length > 0) {
    const marksSum = this.questionMarks.reduce((sum, mark) => sum + mark, 0);
    if (marksSum !== this.totalMarks) {
      return next(new Error(`Sum of question marks (${marksSum}) must equal total marks (${this.totalMarks})`));
    }
  }

  // Validate questions count matches questionCount
  if (this.questions && this.questions.length > this.questionCount) {
    return next(new Error(`Number of questions (${this.questions.length}) exceeds specified question count (${this.questionCount})`));
  }

  next();
});

// Pre-validate to ensure questions belong to correct subject/class
testSchema.pre('validate', async function(next) {
  if (this.questions && this.questions.length > 0) {
    try {
      const Question = mongoose.model('Question');
      const questions = await Question.find({ _id: { $in: this.questions } });
      
      const invalidQuestions = questions.filter(q => 
        q.subject !== this.subject || !q.class.equals(this.class)
      );
      
      if (invalidQuestions.length > 0) {
        return next(new Error('All questions must belong to the test subject and class'));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get tests by teacher
testSchema.statics.getByTeacher = function(teacherId, subject = null, classId = null) {
  const query = { createdBy: teacherId, status: { $ne: 'cancelled' } };
  if (subject) query.subject = subject;
  if (classId) query.class = classId;
  
  return this.find(query)
    .populate('class', 'name level')
    .populate('questions', 'text type difficulty marks')
    .sort({ createdAt: -1 });
};

// Static method to get active tests for student
testSchema.statics.getActiveForStudent = function(studentId, subject = null, classId = null) {
  const query = {
    status: 'scheduled',
    'batches.students': studentId,
    'batches.isActive': true,
    'batches.schedule.start': { $lte: new Date() },
    'batches.schedule.end': { $gte: new Date() }
  };
  
  if (subject) query.subject = subject;
  if (classId) query.class = classId;
  
  return this.find(query)
    .populate('class', 'name level')
    .select('-questions -questionMarks -batches.students')
    .sort({ 'batches.schedule.start': 1 });
};

// Instance method to add batch
testSchema.methods.addBatch = function(batchData) {
  this.batches.push(batchData);
  return this.save();
};

// Instance method to update analytics
testSchema.methods.updateAnalytics = async function() {
  const Result = mongoose.model('Result');
  const stats = await Result.aggregate([
    { $match: { testId: this._id } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: '$score' },
        lastAttempt: { $max: '$submittedAt' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.analytics = {
      totalAttempts: stats[0].totalAttempts,
      averageScore: Math.round(stats[0].averageScore * 100) / 100,
      completionRate: (stats[0].totalAttempts / this.getTotalStudents()) * 100,
      lastAttempt: stats[0].lastAttempt
    };
  }
  
  return this.save();
};

// Instance method to get total students
testSchema.methods.getTotalStudents = function() {
  return this.batches.reduce((total, batch) => total + batch.students.length, 0);
};

// Instance method to check if student is assigned
testSchema.methods.isStudentAssigned = function(studentId) {
  return this.batches.some(batch => 
    batch.students.some(student => student.equals(studentId))
  );
};

// Instance method to get student batch
testSchema.methods.getStudentBatch = function(studentId) {
  return this.batches.find(batch => 
    batch.students.some(student => student.equals(studentId))
  );
};

module.exports = mongoose.model('Test', testSchema);