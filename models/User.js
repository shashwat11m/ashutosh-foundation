const mongoose = require("mongoose");

const birthProfileSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  timeOfBirth: { type: String, required: true, trim: true },
  placeOfBirth: { type: String, required: true, trim: true },
  placeId: { type: String, trim: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String }, // collected at first checkout, used for Cashfree customer_details
  role: { type: String, enum: ["user", "admin"], default: "user" },
  questionsLeft: { type: Number, default: 1 },
  birthProfiles: { type: [birthProfileSchema], default: [] },
  suggestedRemedies: { type: [String], default: [] },
  suggestedGemstones: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
