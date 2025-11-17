const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [2, 'Class name must be at least 2 characters'],
    maxlength: [50, 'Class name cannot exceed 50 characters'],
    match: [/^[A-Z0-9\s\-]+$/, 'Class name can only contain letters, numbers, spaces, and hyphens']
  },
  level: {
    type: String,
    required: [true, 'Class level is required'],
    enum: {
      values: ['primary', 'junior_secondary', 'senior_secondary', 'college'],
      message: 'Level must be primary, junior_secondary, senior_secondary, or college'
    },
    index: true
  },
  grade: {
    type: String,
    required: [true, 'Grade is required'],
    trim: true,
    match: [/^[A-Z0-9\s\-]+$/, 'Grade can only contain letters, numbers, spaces, and hyphens']
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'A'
  },
  subjects: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    isCompulsory: {
      type: Boolean,
      default: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    credits: {
      type: Number,
      min: [0, 'Credits cannot be negative'],
      default: 1
    }
  }],
  capacity: {
    type: Number,
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100'],
    default: 30
  },
  currentStudents: {
    type: Number,
    default: 0,
    min: [0, 'Current students cannot be negative'],
    validate: {
      validator: function(currentStudents) {
        return currentStudents <= this.capacity;
      },
      message: 'Current students cannot exceed class capacity'
    }
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  room: {
    type: String,
    trim: true,
    uppercase: true
  },
  schedule: {
    period: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      default: 'morning'
    },
    startTime: String,
    endTime: String
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}\/\d{4}$/, 'Academic year must be in format YYYY/YYYY']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
classSchema.index({ level: 1, grade: 1, section: 1, academicYear: 1 }, { unique: true });
classSchema.index({ isActive: 1, academicYear: 1 });
classSchema.index({ 'subjects.teacher': 1 });

// Virtual for full class name
classSchema.virtual('fullName').get(function() {
  return `${this.grade}${this.section ? ` ${this.section}` : ''}`;
});

// Virtual for display name
classSchema.virtual('displayName').get(function() {
  return `${this.level.toUpperCase()} - ${this.grade}${this.section ? ` ${this.section}` : ''}`;
});

// Static method to get classes by level
classSchema.statics.getByLevel = function(level, academicYear = null) {
  const query = { level, isActive: true };
  if (academicYear) query.academicYear = academicYear;
  
  return this.find(query)
    .populate('classTeacher', 'name surname email')
    .populate('subjects.teacher', 'name surname email')
    .sort({ grade: 1, section: 1 });
};

// Static method to get classes by teacher
classSchema.statics.getByTeacher = function(teacherId, academicYear = null) {
  const query = {
    $or: [
      { classTeacher: teacherId },
      { 'subjects.teacher': teacherId }
    ],
    isActive: true
  };
  
  if (academicYear) query.academicYear = academicYear;
  
  return this.find(query)
    .populate('classTeacher', 'name surname email')
    .sort({ level: 1, grade: 1 });
};

// Static method to check if class name exists
classSchema.statics.classExists = function(name, excludeId = null) {
  const query = { name: name.trim().toUpperCase() };
  if (excludeId) query._id = { $ne: excludeId };
  return this.findOne(query);
};

// Instance method to add subject
classSchema.methods.addSubject = function(subjectData) {
  const existingSubject = this.subjects.find(sub => 
    sub.name.toLowerCase() === subjectData.name.toLowerCase()
  );
  
  if (existingSubject) {
    throw new Error(`Subject '${subjectData.name}' already exists in this class`);
  }
  
  this.subjects.push(subjectData);
  return this.save();
};

// Instance method to remove subject
classSchema.methods.removeSubject = function(subjectName) {
  const subjectIndex = this.subjects.findIndex(sub => 
    sub.name.toLowerCase() === subjectName.toLowerCase()
  );
  
  if (subjectIndex === -1) {
    throw new Error(`Subject '${subjectName}' not found in this class`);
  }
  
  this.subjects.splice(subjectIndex, 1);
  return this.save();
};

// Instance method to update student count
classSchema.methods.updateStudentCount = async function() {
  const User = mongoose.model('User');
  const studentCount = await User.countDocuments({
    class: this._id,
    role: 'student',
    active: true
  });
  
  this.currentStudents = studentCount;
  return this.save();
};

// Instance method to check if class can be deleted
classSchema.methods.canDelete = async function() {
  const User = mongoose.model('User');
  const Test = mongoose.model('Test');
  const AcademicRecord = mongoose.model('AcademicRecord');
  
  const [studentCount, testCount, recordCount] = await Promise.all([
    User.countDocuments({ class: this._id, role: 'student' }),
    Test.countDocuments({ class: this._id }),
    AcademicRecord.countDocuments({ classId: this._id })
  ]);
  
  return {
    canDelete: studentCount === 0 && testCount === 0 && recordCount === 0,
    dependencies: {
      students: studentCount,
      tests: testCount,
      academicRecords: recordCount
    }
  };
};

// Pre-save middleware to normalize data
classSchema.pre('save', function(next) {
  // Normalize class name
  if (this.isModified('name')) {
    this.name = this.name.trim().toUpperCase();
  }
  
  // Normalize grade
  if (this.isModified('grade')) {
    this.grade = this.grade.trim().toUpperCase();
  }
  
  // Normalize section
  if (this.isModified('section')) {
    this.section = this.section.trim().toUpperCase();
  }
  
  // Normalize subject names
  if (this.isModified('subjects')) {
    this.subjects.forEach(subject => {
      if (subject.name) {
        subject.name = subject.name.trim();
      }
      if (subject.code) {
        subject.code = subject.code.trim().toUpperCase();
      }
    });
  }
  
  next();
});

// Ensure virtual fields are serialized
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Class', classSchema);