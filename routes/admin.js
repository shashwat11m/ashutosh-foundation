const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");

const Article = require("../models/Article");
const User = require("../models/User");
const Question = require("../models/Question");
const Rashi = require("../models/Rashi");

const { requireAdmin } = require("../middleware/auth");

// Every route below requires an admin session.
router.use(requireAdmin);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ---------- ARTICLES ----------
router.get("/", async (req, res) => {
  const articles = await Article.find().sort({ date: -1 });
  const pendingCount = await Question.countDocuments({ status: "pending" });
  res.render("admin", { articles, pendingCount });
});

router.get("/add", (req, res) => {
  res.render("add-article");
});

router.post("/add", upload.single("image"), async (req, res) => {
  const { title, content } = req.body;
  const newArticle = new Article({ title, content, image: req.file ? req.file.filename : null });
  await newArticle.save();
  res.redirect("/admin");
});

router.get("/delete/:id", async (req, res) => {
  await Article.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

router.get("/edit/:id", async (req, res) => {
  const article = await Article.findById(req.params.id);
  res.render("edit-article", { article });
});

router.post("/edit/:id", upload.single("image"), async (req, res) => {
  const { title, content } = req.body;
  const updateData = { title, content };
  if (req.file) updateData.image = req.file.filename;
  await Article.findByIdAndUpdate(req.params.id, updateData);
  res.redirect("/admin");
});

// ---------- ZODIAC SIGN CONTENT ----------
router.get("/rashis", async (req, res) => {
  const rashis = await Rashi.find().sort({ name: 1 });
  res.render("admin-rashis", { rashis });
});

router.get("/rashis/:key/edit", async (req, res) => {
  const rashi = await Rashi.findOne({ key: req.params.key });
  if (!rashi) return res.redirect("/admin/rashis");
  res.render("admin-rashi-edit", { rashi, error: null });
});

router.post("/rashis/:key/edit", async (req, res) => {
  const { name, today, careerYearly, loveYearly, healthYearly, educationYearly, luckyColor, luckyNumber, luckyMood } = req.body;

  await Rashi.findOneAndUpdate({ key: req.params.key }, {
    name: (name || "").trim(),
    today: (today || "").trim(),
    yearly: {
      career: (careerYearly || "").trim(),
      love: (loveYearly || "").trim(),
      health: (healthYearly || "").trim(),
      education: (educationYearly || "").trim()
    },
    lucky: {
      color: (luckyColor || "").trim(),
      number: (luckyNumber || "").trim(),
      mood: (luckyMood || "").trim()
    }
  });

  res.redirect("/admin/rashis");
});

// ---------- QUERY / QUESTION MANAGEMENT ----------
router.get("/queries", async (req, res) => {
  const [pending, answered] = await Promise.all([
    Question.find({ status: "pending" }).populate("user").sort({ createdAt: 1 }),
    Question.find({ status: "answered" }).populate("user").sort({ answeredAt: -1 })
  ]);
  const groupByUser = questions => {
    const groups = new Map();
    questions.forEach(q => {
      if (!q.user) return;
      const key = q.user._id.toString();
      const group = groups.get(key) || { user: q.user, count: 0, latest: q.createdAt };
      group.count += 1;
      if (q.createdAt > group.latest) group.latest = q.createdAt;
      groups.set(key, group);
    });
    return [...groups.values()];
  };
  res.render("admin-queries", { pendingUsers: groupByUser(pending), answeredUsers: groupByUser(answered) });
});

router.get("/queries/user/:userId", async (req, res) => {
  const user = await User.findOne({ _id: req.params.userId, role: "user" });
  if (!user) return res.redirect("/admin/queries");
  const questions = await Question.find({ user: user._id }).sort({ createdAt: 1 });
  res.render("admin-user-chat", { user, questions });
});

router.post("/queries/:id/answer", async (req, res) => {
  const { answerText } = req.body;

  if (answerText && answerText.trim()) {
    await Question.findByIdAndUpdate(req.params.id, {
      answerText: answerText.trim(),
      status: "answered",
      answeredAt: new Date()
    });
  }

  res.redirect(`/admin/queries/user/${req.body.userId || ""}`);
});

router.post("/users/:id/recommendations", async (req, res) => {
  const lines = value => (value || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  await User.findByIdAndUpdate(req.params.id, {
    suggestedRemedies: lines(req.body.suggestedRemedies),
    suggestedGemstones: lines(req.body.suggestedGemstones)
  });
  res.redirect(`/admin/queries/user/${req.params.id}`);
});

// ---------- USER MANAGEMENT ----------
router.get("/users", async (req, res) => {
  const users = await User.find({ role: "user" }).sort({ createdAt: -1 });

  // Pending question count per user, for a quick glance in the list.
  const pendingQuestions = await Question.find({ status: "pending" }).select("user");
  const pendingByUser = {};
  pendingQuestions.forEach(q => {
    const id = q.user.toString();
    pendingByUser[id] = (pendingByUser[id] || 0) + 1;
  });

  res.render("admin-users", { users, pendingByUser });
});

// Add or subtract from a user's quota. `direction` is "add" or "subtract";
// the result is clamped so it can never go below 0 (a subtract that would
// take a user negative just brings them to exactly 0).
router.post("/users/:id/adjust-quota", async (req, res) => {
  let amount = parseInt(req.body.amount, 10);
  if (!amount || amount < 1) amount = 1;

  const direction = req.body.direction === "subtract" ? -1 : 1;

  const user = await User.findById(req.params.id);
  if (user) {
    user.questionsLeft = Math.max(0, user.questionsLeft + amount * direction);
    await user.save();
  }

  res.redirect("/admin/users");
});

// Reset a user's password — for when they've forgotten it and can't use a
// normal self-service reset flow (the site doesn't have email-based
// password reset yet; this is the manual fallback).
router.post("/users/:id/set-password", async (req, res) => {
  const newPassword = req.body.newPassword || "";

  if (newPassword.length < 6) {
    return res.redirect("/admin/users"); // silently no-ops on invalid input;
    // the admin-users.ejs form already enforces minlength client-side, so
    // reaching here means someone bypassed that — not worth a dedicated
    // error page for an admin-only utility action.
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(req.params.id, { password: hashed });

  res.redirect("/admin/users");
});

module.exports = router;
