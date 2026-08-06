const mongoose = require("mongoose");

// One row per "buy questions" attempt. Created as "pending" the moment the
// user picks a quantity, then flipped to "success" (idempotently, from
// either the webhook or the return-from-checkout page — whichever arrives
// first) once Cashfree confirms the payment. Never flip a row to "success"
// twice — see the findOneAndUpdate pattern in routes/dashboard.js and
// routes/webhooks.js.
const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionsBought: { type: Number, required: true },
  amount: { type: Number, required: true },
  cfOrderId: { type: String, unique: true, sparse: true }, // order_id sent to Cashfree
  paymentSessionId: { type: String },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);
