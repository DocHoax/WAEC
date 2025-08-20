const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
  class: { type: String, required: false }, // Optional for principal signature
  classTeacherSignature: { type: String },
  principalSignature: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Signature', signatureSchema);