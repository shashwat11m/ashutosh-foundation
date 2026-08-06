const express = require("express");
const router = express.Router();
const { requireLogin } = require("../middleware/auth");
const User = require("../models/User");
const Question = require("../models/Question");
const Transaction = require("../models/Transaction");

// Placeholder pricing — change freely, nothing else depends on this number.
const PRICE_PER_QUESTION = 99; // in ₹

// Mounted at /dashboard in app.js, so these paths are relative to that.

// ---------- USER DASHBOARD ----------
router.get("/", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const questions = await Question.find({ user: user._id }).sort({ createdAt: 1 });

  res.render("dashboard", { user, questions, error: null });
});

// ---------- ASK A QUESTION ----------
router.post("/ask", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const { questionText } = req.body;

  const renderWithError = async (message) => {
    const questions = await Question.find({ user: user._id }).sort({ createdAt: 1 });
    res.render("dashboard", { user, questions, error: message });
  };

  if (!questionText || !questionText.trim()) {
    return renderWithError("Please type a question.");
  }

  if (user.questionsLeft <= 0) {
    return renderWithError("You're out of questions. Please buy more to continue.");
  }

  await Question.create({ user: user._id, questionText: questionText.trim() });

  user.questionsLeft -= 1;
  await user.save();

  res.redirect("/dashboard");
});

// ---------- BUY QUESTIONS: pick a quantity ----------
router.get("/buy", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render("buy-questions", { user, pricePerQuestion: PRICE_PER_QUESTION });
});

router.post("/buy", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  let qty = parseInt(req.body.quantity, 10);

  if (!qty || qty < 1) qty = 1;
  if (qty > 100) qty = 100;

  const amount = qty * PRICE_PER_QUESTION;

  // No real payment gateway yet — this just shows a mock "order summary"
  // page. Replace /buy/confirm below with a real gateway callback later.
  res.render("payment-mock", { user, qty, amount, pricePerQuestion: PRICE_PER_QUESTION });
});

// ---------- BUY QUESTIONS: mock payment confirmation ----------
router.post("/buy/confirm", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  let qty = parseInt(req.body.qty, 10);
  let amount = parseInt(req.body.amount, 10);

  if (!qty || qty < 1) qty = 1;
  if (!amount || amount < 1) amount = qty * PRICE_PER_QUESTION;

  await Transaction.create({
    user: user._id,
    questionsBought: qty,
    amount,
    status: "success" // mock gateway: always succeeds
  });

  user.questionsLeft += qty;
  await user.save();

  res.redirect("/dashboard");
});

module.exports = router;
