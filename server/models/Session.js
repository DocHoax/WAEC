const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    match: [/^\d{4}\/\d{4} (First|Second|Third) Term$/, 'Session must be in format YYYY/YYYY First/Second/Third Term'],
  },
  isActive: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Ensure only one session is active at a time
sessionSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany({ _id: { $ne: this._id }, isActive: true }, { isActive: false });
  }
  next();
});

module.exports = mongoose.model('Session', sessionSchema);