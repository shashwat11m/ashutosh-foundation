const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String }, // collected at first checkout, used for Cashfree customer_details
  role: { type: String, enum: ["user", "admin"], default: "user" },
  questionsLeft: { type: Number, default: 3 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
