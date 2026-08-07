const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionText: { type: String, required: true },
  birthProfile: { type: mongoose.Schema.Types.ObjectId },
  secondBirthProfile: { type: mongoose.Schema.Types.ObjectId },
  answerText: { type: String, default: "" },
  status: { type: String, enum: ["pending", "answered"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  answeredAt: { type: Date }
});

module.exports = mongoose.model("Question", questionSchema);
