const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const Article = require("../models/Article");
const User = require("../models/User");
const Question = require("../models/Question");

const { requireAdmin } = require("../middleware/auth");

// Every route below requires an admin session.
router.use(requireAdmin);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ---------- ARTICLES (moved here from main.js/admin.js to remove the
// duplicate /admin route both files used to define) ----------
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

// ---------- QUERY / QUESTION MANAGEMENT ----------
router.get("/queries", async (req, res) => {
  const pending = await Question.find({ status: "pending" }).populate("user").sort({ createdAt: 1 });
  const answered = await Question.find({ status: "answered" }).populate("user").sort({ answeredAt: -1 });

  res.render("admin-queries", { pending, answered });
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

  res.redirect("/admin/queries");
});

// ---------- USER MANAGEMENT (quota top-ups) ----------
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

router.post("/users/:id/add-quota", async (req, res) => {
  let amount = parseInt(req.body.amount, 10);
  if (!amount || amount < 1) amount = 1;

  await User.findByIdAndUpdate(req.params.id, { $inc: { questionsLeft: amount } });

  res.redirect("/admin/users");
});

module.exports = router;
