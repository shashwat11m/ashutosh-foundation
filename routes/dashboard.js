const express = require("express");
const router = express.Router();
const { requireLogin } = require("../middleware/auth");
const User = require("../models/User");
const Question = require("../models/Question");
const Transaction = require("../models/Transaction");
const { createOrder, getOrder } = require("../services/cashfree");

const PRICE_PER_QUESTION = 99; // in ₹ — change freely

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
  res.render("buy-questions", { user, pricePerQuestion: PRICE_PER_QUESTION, error: null });
});

// ---------- BUY QUESTIONS: create a Cashfree order, hand off to checkout ----------
router.post("/buy", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);

  let qty = parseInt(req.body.quantity, 10);
  if (!qty || qty < 1) qty = 1;
  if (qty > 100) qty = 100;

  const phone = (req.body.phone || user.phone || "").trim();
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.render("buy-questions", {
      user,
      pricePerQuestion: PRICE_PER_QUESTION,
      error: "Please enter a valid 10-digit Indian mobile number — Cashfree requires this to process the payment."
    });
  }

  if (!user.phone) {
    user.phone = phone;
    await user.save();
  }

  const amount = qty * PRICE_PER_QUESTION;

  const tx = await Transaction.create({
    user: user._id,
    questionsBought: qty,
    amount,
    status: "pending"
  });

  const cfOrderId = `q${tx._id}`;
  tx.cfOrderId = cfOrderId;
  await tx.save();

  const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;

  try {
    const order = await createOrder({
      orderId: cfOrderId,
      amount,
      customer: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone
      },
      returnUrl: `${baseUrl}/dashboard/buy/return?order_id=${cfOrderId}`,
      notifyUrl: `${baseUrl}/webhooks/cashfree`,
      note: `${qty} question(s) for ${user.email}`
    });

    tx.paymentSessionId = order.payment_session_id;
    await tx.save();

    res.render("checkout", {
      user,
      qty,
      amount,
      paymentSessionId: order.payment_session_id,
      cfMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox"
    });
  } catch (err) {
    console.error("Cashfree create order failed:", err.response ? err.response.data : err.message);
    tx.status = "failed";
    await tx.save();

    res.render("buy-questions", {
      user,
      pricePerQuestion: PRICE_PER_QUESTION,
      error: "Could not start the payment right now. Please try again in a moment."
    });
  }
});

// ---------- BUY QUESTIONS: user lands here after Cashfree checkout ----------
// Source of truth here is always a fresh Get Order call to Cashfree — never
// trust query params alone, since those are just a browser redirect, not an
// authenticated confirmation. Crediting is idempotent (see the
// findOneAndUpdate below), so it's safe if the webhook already handled it.
router.get("/buy/return", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const cfOrderId = req.query.order_id;

  if (!cfOrderId) {
    return res.render("payment-result", { user, success: false, message: "Missing order reference." });
  }

  const tx = await Transaction.findOne({ cfOrderId, user: user._id });
  if (!tx) {
    return res.render("payment-result", { user, success: false, message: "We couldn't find that order." });
  }

  if (tx.status === "success") {
    return res.render("payment-result", {
      user,
      success: true,
      message: `${tx.questionsBought} question(s) added to your account.`
    });
  }

  try {
    const order = await getOrder(cfOrderId);

    if (order.order_status === "PAID") {
      const credited = await Transaction.findOneAndUpdate(
        { cfOrderId, status: { $ne: "success" } },
        { status: "success" },
        { new: true }
      );

      if (credited) {
        await User.findByIdAndUpdate(user._id, { $inc: { questionsLeft: credited.questionsBought } });
      }

      return res.render("payment-result", {
        user,
        success: true,
        message: `${tx.questionsBought} question(s) added to your account.`
      });
    }

    if (order.order_status === "ACTIVE") {
      return res.render("payment-result", {
        user,
        success: false,
        message: "Payment is still processing. If money was deducted, it will reflect here shortly — check back in a few minutes."
      });
    }

    await Transaction.updateOne({ cfOrderId }, { status: "failed" });
    return res.render("payment-result", { user, success: false, message: "Payment was not completed." });
  } catch (err) {
    console.error("Cashfree get order failed:", err.response ? err.response.data : err.message);
    return res.render("payment-result", {
      user,
      success: false,
      message: "We couldn't confirm your payment right now. If money was deducted, it will be credited automatically once confirmed."
    });
  }
});

module.exports = router;
