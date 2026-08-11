// models/Lead.js
const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: String },
  timeOfBirth: { type: String },
  placeOfBirth: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Lead", leadSchema);