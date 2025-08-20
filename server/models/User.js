const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  class: { type: String, default: '' },
  subjects: [{ subject: String, class: String }], // For teachers
  enrolledSubjects: [{ subject: String, class: String }], // For students
  blocked: { type: Boolean, default: false },
  picture: { type: String, default: '' }, // Stores filename or path
  dateOfBirth: { type: Date },
  address: { type: String },
  phoneNumber: { type: String },
  sex: { type: String, enum: ['male', 'female', 'other'] },
  age: { type: Number },
});

module.exports = mongoose.model('User', userSchema);