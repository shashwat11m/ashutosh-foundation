const express = require("express");
const router = express.Router();
const { requireLogin } = require("../middleware/auth");
const User = require("../models/User");
const Question = require("../models/Question");
const Transaction = require("../models/Transaction");
const { createOrder, getOrder } = require("../services/cashfree");

// wasQty is purely a display number for the "limited time offer" framing
// on buy-questions.ejs (struck-through) — it has no effect on price or on
// how many questions are actually credited. price/qty below are what's
// actually charged and credited; never derive either from wasQty.
const QUESTION_PLANS = {
  3: { price: 251, wasQty: 2 },
  5: { price: 351, wasQty: 3 },
  8: { price: 501, wasQty: 5 }
};

const dashboardData = async (user, error = null) => ({
  user, error, googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  questions: await Question.find({ user: user._id }).sort({ createdAt: 1 })
});

router.get("/", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render("dashboard", await dashboardData(user));
});

// ---------- PROFILE (name + phone only — email is left alone since it's
// tied to login and Cashfree customer records; changing it safely would
// need its own verification flow, out of scope here) ----------
router.post("/profile", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const { name, phone } = req.body;

  if (!name?.trim()) {
    return res.render("dashboard", await dashboardData(user, "Name can't be empty."));
  }
  if (phone && !/^[6-9]\d{9}$/.test(phone.trim())) {
    return res.render("dashboard", await dashboardData(user, "Please enter a valid 10-digit Indian mobile number, or leave it blank."));
  }

  user.name = name.trim();
  user.phone = phone?.trim() || user.phone;
  await user.save();
  req.session.name = user.name; // keep session (used by header.ejs) in sync

  res.redirect("/dashboard");
});

// ---------- BIRTH PROFILES ----------
router.post("/birth-profiles", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const { label, dateOfBirth, timeOfBirth, placeOfBirth, placeId } = req.body;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (!label?.trim() || !timeOfBirth || !placeOfBirth?.trim() || Number.isNaN(dob.getTime())) {
    return res.render("dashboard", await dashboardData(user, "Please complete valid birth details."));
  }
  user.birthProfiles.push({ label: label.trim(), dateOfBirth: dob, timeOfBirth: timeOfBirth.trim(), placeOfBirth: placeOfBirth.trim(), placeId: placeId?.trim() || "" });
  await user.save();
  res.redirect("/dashboard");
});

router.post("/birth-profiles/:profileId/edit", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const profile = user.birthProfiles.id(req.params.profileId);
  if (!profile) return res.redirect("/dashboard");

  const { label, dateOfBirth, timeOfBirth, placeOfBirth, placeId } = req.body;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (!label?.trim() || !timeOfBirth || !placeOfBirth?.trim() || Number.isNaN(dob.getTime())) {
    return res.render("dashboard", await dashboardData(user, "Please complete valid birth details."));
  }

  profile.label = label.trim();
  profile.dateOfBirth = dob;
  profile.timeOfBirth = timeOfBirth.trim();
  profile.placeOfBirth = placeOfBirth.trim();
  profile.placeId = placeId?.trim() || "";

  await user.save();
  res.redirect("/dashboard");
});

router.post("/birth-profiles/:profileId/delete", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const profile = user.birthProfiles.id(req.params.profileId);
  if (profile) {
    profile.deleteOne();
    await user.save();
  }
  // Note: past questions that reference this profile keep working — both
  // dashboard.ejs and admin-user-chat.ejs already fall back to "Saved
  // profile" when the referenced birthProfile no longer resolves.
  res.redirect("/dashboard");
});

router.post("/ask", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const { questionText, birthProfileId, secondBirthProfileId } = req.body;
  const renderError = message => dashboardData(user, message).then(data => res.render("dashboard", data));
  if (!questionText?.trim()) return renderError("Please type a question.");
  if (user.questionsLeft <= 0) return renderError("You're out of questions. Please buy more to continue.");
  const ids = user.birthProfiles.map(profile => profile._id.toString());
  if (!birthProfileId || !ids.includes(birthProfileId)) return renderError("Please select whose birth details this question is about.");
  if (secondBirthProfileId && (!ids.includes(secondBirthProfileId) || secondBirthProfileId === birthProfileId)) return renderError("Choose a different second person for a compatibility question.");
  await Question.create({ user: user._id, questionText: questionText.trim(), birthProfile: birthProfileId, secondBirthProfile: secondBirthProfileId || undefined });
  user.questionsLeft -= 1;
  await user.save();
  res.redirect("/dashboard");
});

router.get("/buy", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render("buy-questions", { user, plans: QUESTION_PLANS, error: null });
});

router.post("/buy", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const qty = parseInt(req.body.quantity, 10);
  const plan = QUESTION_PLANS[qty];
  if (!plan) return res.render("buy-questions", { user, plans: QUESTION_PLANS, error: "Please select one of the available question packs." });
  const amount = plan.price;
  const phone = (req.body.phone || user.phone || "").trim();
  if (!/^[6-9]\d{9}$/.test(phone)) return res.render("buy-questions", { user, plans: QUESTION_PLANS, error: "Please enter a valid 10-digit Indian mobile number — Cashfree requires this to process the payment." });
  if (!user.phone) { user.phone = phone; await user.save(); }
  const tx = await Transaction.create({ user: user._id, questionsBought: qty, amount, status: "pending" });
  const cfOrderId = `q${tx._id}`;
  tx.cfOrderId = cfOrderId;
  await tx.save();
  const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
  try {
    const order = await createOrder({ orderId: cfOrderId, amount, customer: { id: user._id.toString(), name: user.name, email: user.email, phone }, returnUrl: `${baseUrl}/dashboard/buy/return?order_id=${cfOrderId}`, notifyUrl: `${baseUrl}/webhooks/cashfree`, note: `${qty} question(s) for ${user.email}` });
    tx.paymentSessionId = order.payment_session_id;
    await tx.save();
    res.render("checkout", { user, qty, amount, paymentSessionId: order.payment_session_id, cfMode: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox" });
  } catch (err) {
    console.error("Cashfree create order failed:", err.response ? err.response.data : err.message);
    tx.status = "failed"; await tx.save();
    res.render("buy-questions", { user, plans: QUESTION_PLANS, error: "Could not start the payment right now. Please try again in a moment." });
  }
});

router.get("/buy/return", requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const cfOrderId = req.query.order_id;
  if (!cfOrderId) return res.render("payment-result", { user, success: false, message: "Missing order reference." });
  const tx = await Transaction.findOne({ cfOrderId, user: user._id });
  if (!tx) return res.render("payment-result", { user, success: false, message: "We couldn't find that order." });
  if (tx.status === "success") return res.render("payment-result", { user, success: true, message: `${tx.questionsBought} question(s) added to your account.` });
  try {
    const order = await getOrder(cfOrderId);
    if (order.order_status === "PAID") {
      const credited = await Transaction.findOneAndUpdate({ cfOrderId, status: { $ne: "success" } }, { status: "success" }, { new: true });
      if (credited) await User.findByIdAndUpdate(user._id, { $inc: { questionsLeft: credited.questionsBought } });
      return res.render("payment-result", { user, success: true, message: `${tx.questionsBought} question(s) added to your account.` });
    }
    if (order.order_status === "ACTIVE") return res.render("payment-result", { user, success: false, message: "Payment is still processing. If money was deducted, it will reflect here shortly — check back in a few minutes." });
    await Transaction.updateOne({ cfOrderId }, { status: "failed" });
    return res.render("payment-result", { user, success: false, message: "Payment was not completed." });
  } catch (err) {
    console.error("Cashfree get order failed:", err.response ? err.response.data : err.message);
    return res.render("payment-result", { user, success: false, message: "We couldn't confirm your payment right now. If money was deducted, it will be credited automatically once confirmed." });
  }
});

module.exports = router;
