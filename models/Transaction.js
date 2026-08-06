const mongoose = require("mongoose");

// Mock payment record. Swap the confirm route in routes/dashboard.js for a
// real gateway (Razorpay/Stripe) later without changing this schema much.
const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionsBought: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["success"], default: "success" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);
