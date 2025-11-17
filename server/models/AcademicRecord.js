const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class ID is required'],
    index: true
  },
  session: {
    type: String,
    required: [true, 'Session is required'],
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
  grades: [{
    subject: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true
    },
    subjectCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100']
    },
    grade: {
      type: String,
      required: [true, 'Grade is required'],
      enum: {
        values: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F'],
        message: 'Invalid grade value'
      },
      uppercase: true
    },
    gradePoint: {
      type: Number,
      min: [0, 'Grade point cannot be negative'],
      max: [5, 'Grade point cannot exceed 5']
    },
    remark: {
      type: String,
      trim: true,
      maxlength: [100, 'Remark cannot exceed 100 characters']
    },
    teacherComment: {
      type: String,
      trim: true,
      maxlength: [200, 'Teacher comment cannot exceed 200 characters']
    },
    isCompulsory: {
      type: Boolean,
      default: true
    },
    credits: {
      type: Number,
      min: [0, 'Credits cannot be negative'],
      default: 1
    }
  }],
  attendance: {
    present: {
      type: Number,
      min: [0, 'Present days cannot be negative'],
      default: 0
    },
    absent: {
      type: Number,
      min: [0, 'Absent days cannot be negative'],
      default: 0
    },
    late: {
      type: Number,
      min: [0, 'Late days cannot be negative'],
      default: 0
    },
    totalDays: {
      type: Number,
      min: [0, 'Total days cannot be negative'],
      default: 0
    }
  },
  totalScore: {
    type: Number,
    min: [0, 'Total score cannot be negative']
  },
  average: {
    type: Number,
    min: [0, 'Average cannot be negative'],
    max: [100, 'Average cannot exceed 100']
  },
  gpa: {
    type: Number,
    min: [0, 'GPA cannot be negative'],
    max: [5, 'GPA cannot exceed 5']
  },
  position: {
    type: Number,
    min: [1, 'Position must be at least 1']
  },
  totalStudents: {
    type: Number,
    min: [1, 'Total students must be at least 1']
  },
  promoted: {
    type: Boolean,
    default: false,
    index: true
  },
  promotionDate: {
    type: Date
  },
  promotedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  conduct: {
    type: String,
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
    default: 'satisfactory'
  },
  teacherRemarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Teacher remarks cannot exceed 500 characters']
  },
  principalRemarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Principal remarks cannot exceed 500 characters']
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
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
academicRecordSchema.index({ studentId: 1, session: 1, term: 1 }, { unique: true });
academicRecordSchema.index({ classId: 1, session: 1, term: 1 });
academicRecordSchema.index({ promoted: 1, session: 1 });

// Pre-save middleware to calculate derived fields
academicRecordSchema.pre('save', function(next) {
  // Calculate total score and average
  if (this.grades && this.grades.length > 0) {
    this.totalScore = this.grades.reduce((sum, grade) => sum + grade.score, 0);
    this.average = this.totalScore / this.grades.length;
  }

  // Calculate GPA
  if (this.grades && this.grades.length > 0) {
    const totalGradePoints = this.grades.reduce((sum, grade) => {
      return sum + (grade.gradePoint || 0) * (grade.credits || 1);
    }, 0);
    
    const totalCredits = this.grades.reduce((sum, grade) => {
      return sum + (grade.credits || 1);
    }, 0);
    
    this.gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  }

  // Calculate attendance percentage
  if (this.attendance.totalDays > 0) {
    this.attendance.percentage = (
      (this.attendance.present / this.attendance.totalDays) * 100
    ).toFixed(2);
  }

  next();
});

// Static method to get student academic history
academicRecordSchema.statics.getStudentHistory = function(studentId, session = null) {
  const query = { studentId, isActive: true };
  if (session) query.session = session;
  
  return this.find(query)
    .populate('classId', 'name level grade')
    .populate('promotedTo', 'name level grade')
    .sort({ session: -1, term: -1 });
};

// Static method to get class results
academicRecordSchema.statics.getClassResults = function(classId, session, term) {
  return this.find({
    classId,
    session,
    term,
    isActive: true
  })
  .populate('studentId', 'name surname studentId')
  .sort({ average: -1 });
};

// Static method to calculate class statistics
academicRecordSchema.statics.getClassStatistics = async function(classId, session, term) {
  const results = await this.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
        session,
        term,
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        averageScore: { $avg: '$average' },
        highestScore: { $max: '$average' },
        lowestScore: { $min: '$average' },
        promotedCount: {
          $sum: { $cond: ['$promoted', 1, 0] }
        }
      }
    }
  ]);

  return results.length > 0 ? results[0] : {
    totalStudents: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    promotedCount: 0
  };
};

// Instance method to calculate grade
academicRecordSchema.methods.calculateGrade = function(score) {
  if (score >= 90) return { grade: 'A+', gradePoint: 5.0 };
  if (score >= 80) return { grade: 'A', gradePoint: 4.0 };
  if (score >= 75) return { grade: 'B+', gradePoint: 3.5 };
  if (score >= 70) return { grade: 'B', gradePoint: 3.0 };
  if (score >= 65) return { grade: 'C+', gradePoint: 2.5 };
  if (score >= 60) return { grade: 'C', gradePoint: 2.0 };
  if (score >= 50) return { grade: 'D', gradePoint: 1.0 };
  if (score >= 40) return { grade: 'E', gradePoint: 0.5 };
  return { grade: 'F', gradePoint: 0.0 };
};

// Instance method to add grade
academicRecordSchema.methods.addGrade = function(gradeData) {
  const existingGradeIndex = this.grades.findIndex(
    g => g.subject.toLowerCase() === gradeData.subject.toLowerCase()
  );

  const calculatedGrade = this.calculateGrade(gradeData.score);
  
  const gradeToAdd = {
    ...gradeData,
    grade: calculatedGrade.grade,
    gradePoint: calculatedGrade.gradePoint
  };

  if (existingGradeIndex !== -1) {
    this.grades[existingGradeIndex] = gradeToAdd;
  } else {
    this.grades.push(gradeToAdd);
  }

  return this.save();
};

// Instance method to get subject grade
academicRecordSchema.methods.getSubjectGrade = function(subjectName) {
  return this.grades.find(
    g => g.subject.toLowerCase() === subjectName.toLowerCase()
  );
};

// Ensure virtual fields are serialized
academicRecordSchema.set('toJSON', { virtuals: true });
academicRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);