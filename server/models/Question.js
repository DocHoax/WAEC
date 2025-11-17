const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
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
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    minlength: [10, 'Question text must be at least 10 characters'],
    maxlength: [1000, 'Question text cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
      message: 'Question type must be multiple_choice, true_false, short_answer, or essay'
    },
    default: 'multiple_choice',
    index: true
  },
  options: [{
    type: String,
    required: function() {
      return this.type === 'multiple_choice';
    },
    validate: {
      validator: function(options) {
        if (this.type === 'multiple_choice') {
          return options && options.length >= 2 && options.length <= 6;
        }
        return true;
      },
      message: 'Multiple choice questions must have 2-6 options'
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return this.type !== 'essay';
    },
    validate: {
      validator: function(correctAnswer) {
        if (this.type === 'multiple_choice') {
          return this.options && this.options.includes(correctAnswer);
        }
        if (this.type === 'true_false') {
          return ['true', 'false', true, false].includes(correctAnswer);
        }
        return true;
      },
      message: 'Correct answer must be one of the provided options for multiple choice questions'
    }
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    min: [1, 'Marks must be at least 1'],
    max: [100, 'Marks cannot exceed 100'],
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  formula: {
    type: String,
    trim: true,
    default: null
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [500, 'Explanation cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        if (!url) return true;
        return /^https?:\/\/.+\..+/.test(url);
      },
      message: 'Invalid image URL format'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    index: true
  },
  saveToBank: {
    type: Boolean,
    default: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
questionSchema.index({ subject: 1, class: 1, isActive: 1 });
questionSchema.index({ createdBy: 1, isActive: 1 });
questionSchema.index({ tags: 1, isActive: 1 });
questionSchema.index({ saveToBank: 1, isActive: 1 });
questionSchema.index({ difficulty: 1, subject: 1, class: 1 });

// Pre-save middleware to handle type-specific validation
questionSchema.pre('save', function(next) {
  // Normalize correctAnswer for true_false questions
  if (this.type === 'true_false' && typeof this.correctAnswer === 'boolean') {
    this.correctAnswer = this.correctAnswer.toString();
  }
  
  // Ensure options are only for multiple_choice questions
  if (this.type !== 'multiple_choice') {
    this.options = undefined;
  }
  
  // Update usage tracking
  if (this.testId && this.isNew) {
    this.usageCount = 1;
    this.lastUsed = new Date();
  }
  
  next();
});

// Static method to get questions by subject and class
questionSchema.statics.getBySubjectAndClass = function(subject, classId, options = {}) {
  const {
    difficulty,
    tags,
    type,
    limit = 50,
    skip = 0,
    excludeIds = []
  } = options;
  
  const query = {
    subject,
    class: classId,
    isActive: true,
    saveToBank: true
  };
  
  if (difficulty) query.difficulty = difficulty;
  if (type) query.type = type;
  if (tags && tags.length > 0) query.tags = { $in: tags };
  if (excludeIds.length > 0) query._id = { $nin: excludeIds };
  
  return this.find(query)
    .select('-correctAnswer')
    .limit(limit)
    .skip(skip)
    .sort({ usageCount: 1, createdAt: -1 }); // Prefer less used questions
};

// Static method to get question statistics
questionSchema.statics.getStatistics = function(createdBy = null) {
  const matchStage = { isActive: true };
  if (createdBy) matchStage.createdBy = createdBy;
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        bySubject: { $push: '$subject' },
        byDifficulty: { $push: '$difficulty' },
        byType: { $push: '$type' },
        totalUsage: { $sum: '$usageCount' }
      }
    },
    {
      $project: {
        totalQuestions: 1,
        totalUsage: 1,
        subjectDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$bySubject', []] },
              as: 'subject',
              in: {
                k: '$$subject',
                v: {
                  $size: {
                    $filter: {
                      input: '$bySubject',
                      as: 's',
                      cond: { $eq: ['$$s', '$$subject'] }
                    }
                  }
                }
              }
            }
          }
        },
        difficultyDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$byDifficulty', []] },
              as: 'difficulty',
              in: {
                k: '$$difficulty',
                v: {
                  $size: {
                    $filter: {
                      input: '$byDifficulty',
                      as: 'd',
                      cond: { $eq: ['$$d', '$$difficulty'] }
                    }
                  }
                }
              }
            }
          }
        },
        typeDistribution: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$byType', []] },
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      as: 't',
                      cond: { $eq: ['$$t', '$$type'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);
};

// Instance method to get question without sensitive data
questionSchema.methods.toSafeObject = function() {
  const question = this.toObject();
  delete question.correctAnswer;
  return question;
};

// Instance method to increment usage count
questionSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Virtual for question display
questionSchema.virtual('displayText').get(function() {
  return this.text.length > 100 ? this.text.substring(0, 100) + '...' : this.text;
});

// Ensure virtual fields are serialized
questionSchema.set('toJSON', { virtuals: true });
questionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Question', questionSchema);