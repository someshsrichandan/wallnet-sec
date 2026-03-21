const { Schema, model } = require('mongoose');

const problemStatementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    shortDescription: { type: String, required: true, trim: true, maxlength: 500 },
    problem: {
      phishingSteps: { type: [String], default: [] },
      ratSteps: { type: [String], default: [] },
    },
    goals: { type: [String], default: [] },
    difficulty: { type: String, default: 'Intermediate', trim: true, maxlength: 80 },
    techStack: { type: [String], default: [] },
    dataResources: { type: String, default: '', maxlength: 500 },
    mentorship: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    judgingCriteria: { type: String, default: '', maxlength: 500 },
    prizes: { type: String, default: '', maxlength: 500 },
    timeline: { type: String, default: '', maxlength: 120 },
  },
  { timestamps: true }
);

module.exports = model('ProblemStatement', problemStatementSchema);
