const { Schema, model } = require('mongoose');

const submissionSchema = new Schema(
  {
    teamName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    summary: { type: String, required: true, maxlength: 5000 },
    techStack: { type: String, default: '', maxlength: 200 },
    timeline: { type: String, default: '', maxlength: 120 },
    consent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('Submission', submissionSchema);
