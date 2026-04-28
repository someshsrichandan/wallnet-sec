const { Schema, model } = require("mongoose");

const webhookLogSchema = new Schema(
  {
    partnerId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    event: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed },
    status: { type: Number }, // HTTP Status Code
    response: { type: Schema.Types.Mixed },
    success: { type: Boolean, default: false, index: true },
    errorMessage: { type: String },
    latencyMs: { type: Number },
  },
  { timestamps: true }
);

module.exports = model("WebhookLog", webhookLogSchema);
