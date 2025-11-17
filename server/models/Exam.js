const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
    enum: {
      values: ['First Term Examination', 'Second Term Examination', 'Third Term Examination', 'Final Examination'],
      message: 'Invalid exam title'
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
  date: {
    type: Date,
    required: [true, 'Exam date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Exam date must be in the future'
    },
    index: true
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [360, 'Duration cannot exceed 6 hours']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks are required'],
    min: [1, 'Total marks must be at least 1'],
    max: [100, 'Total marks cannot exceed 100']
  },
  passingMarks: {
    type: Number,
    min: [0, 'Passing marks cannot be negative'],
    max: [this.totalMarks, 'Passing marks cannot exceed total marks'],
    default: function() {
      return Math.ceil(this.totalMarks * 0.4); // 40% by default
    }
  },
  venue: {
    type: String,
    trim: true,
    required: [true, 'Venue is required'],
    maxlength: [100, 'Venue cannot exceed 100 characters']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Supervisor is required']
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      message: 'Status must be scheduled, ongoing, completed, or cancelled'
    },
    default: 'scheduled',
    index: true
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seatNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    attended: {
      type: Boolean,
      default: false
    },
    score: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [this.totalMarks, 'Score cannot exceed total marks']
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F']
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, 'Remarks cannot exceed 200 characters']
    }
  }],
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

// Compound indexes
examSchema.index({ class: 1, subject: 1, session: 1, term: 1 });
examSchema.index({ date: 1, status: 1 });
examSchema.index({ supervisor: 1, status: 1 });

// Virtual for exam status
examSchema.virtual('examStatus').get(function() {
  const now = new Date();
  const examDate = new Date(this.date);
  const endTime = new Date(examDate.getTime() + this.duration * 60000);

  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'completed') return 'completed';
  if (now < examDate) return 'upcoming';
  if (now >= examDate && now <= endTime) return 'ongoing';
  if (now > endTime) return 'completed';
  return 'scheduled';
});

// Static method to get exams by class
examSchema.statics.getByClass = function(classId, session = null, term = null) {
  const query = { class: classId, isActive: true };
  if (session) query.session = session;
  if (term) query.term = term;
  
  return this.find(query)
    .populate('class', 'name level grade')
    .populate('supervisor', 'name surname email')
    .populate('students.student', 'name surname studentId')
    .sort({ date: 1 });
};

// Static method to get exams by supervisor
examSchema.statics.getBySupervisor = function(supervisorId, status = null) {
  const query = { supervisor: supervisorId, isActive: true };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('class', 'name level grade')
    .sort({ date: 1 });
};

// Instance method to add student
examSchema.methods.addStudent = function(studentId, seatNumber = null) {
  const existingStudent = this.students.find(s => 
    s.student.toString() === studentId.toString()
  );

  if (existingStudent) {
    throw new Error('Student already added to this exam');
  }

  this.students.push({
    student: studentId,
    seatNumber: seatNumber || `S${this.students.length + 1}`.padStart(3, '0'),
    attended: false
  });

  return this.save();
};

// Instance method to record student result
examSchema.methods.recordResult = function(studentId, score, remarks = '') {
  const student = this.students.find(s => 
    s.student.toString() === studentId.toString()
  );

  if (!student) {
    throw new Error('Student not found in this exam');
  }

  student.attended = true;
  student.score = score;
  student.remarks = remarks;
  
  // Calculate grade
  const percentage = (score / this.totalMarks) * 100;
  student.grade = this.calculateGrade(percentage);

  return this.save();
};

// Instance method to calculate grade
examSchema.methods.calculateGrade = function(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
};

// Ensure virtual fields are serialized
examSchema.set('toJSON', { virtuals: true });
examSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Exam', examSchema);