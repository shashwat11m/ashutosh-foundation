const express = require("express");
const router = express.Router();
const { getPanchangForDate } = require("../services/panchangService");
const Article = require("../models/Article");
const Rashi = require("../models/Rashi");

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Homepage
router.get("/", async (req, res) => {
  const articles = await Article.find().sort({ date: -1 }).limit(5);
  const panchang = getPanchangForDate(new Date()); // "today" — correct as
  // long as process.env.TZ = "Asia/Kolkata" is set (see app.js)

  // rashiDataAll used to be a hardcoded object here — now lives in the
  // Rashi collection (admin-editable via /admin/rashis). Rebuilt into the
  // same { aries: {...}, taurus: {...} } shape so home.ejs doesn't need to
  // change how it reads this.
  const rashiDocs = await Rashi.find();
  const rashiDataAll = {};
  rashiDocs.forEach(r => { rashiDataAll[r.key] = r; });

  res.render("home", { articles, rashiDataAll, panchang, googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "" });
});

// Panchang Page
router.get("/panchang", (req, res) => {
  let date = new Date(); // defaults to "now" in IST, per process.env.TZ

  if (req.query.date) {
    const parsed = new Date(`${req.query.date}T12:00:00`); // noon avoids
    // any DST/rounding edge cases when parsing a bare YYYY-MM-DD string —
    // moot for India (no DST) but a harmless safety margin regardless.
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  const panchang = getPanchangForDate(date);
  const dateInputValue = date.toISOString().slice(0, 10); // for the <input type="date"> value

  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(date);
  next.setDate(next.getDate() + 1);

  res.render("panchang", {
    panchang,
    dateInputValue,
    prevDate: prev.toISOString().slice(0, 10),
    nextDate: next.toISOString().slice(0, 10)
  });
});

// Name Numerology Calculator (Chaldean)
router.get("/numerology", (req, res) => {
  res.render("numerology");
});

// Rashi page
router.get("/rashi/:name", async (req, res) => {
  const key = req.params.name.toLowerCase();
  const rashiData = (await Rashi.findOne({ key })) || (await Rashi.findOne({ key: "aries" }));

  res.render("rashi", { rashi: key, rashiData });
});

router.get("/article/:id", async (req, res) => {
  const article = await Article.findById(req.params.id);
  res.render("article", { article });
});

router.get("/articles", async (req, res) => {
  const articles = await Article.find().sort({ date: -1 });
  res.render("all-articles", { articles });
});

router.get("/contact-us", (req, res) => {
  res.render("contact-us");
});

router.get("/terms-and-conditions", (req, res) => {
  res.render("terms-and-conditions");
});

router.get("/cancellation-and-refund", (req, res) => {
  res.render("cancellation-and-refund");
});

// NOTE: all /admin* routes (article management + queries/users/rashi
// management) live in routes/admin.js, protected by requireAdmin.

router.get("/add-article", async (req, res) => {
  // Leftover test route from development — safe to delete once you don't
  // need it anymore. Left untouched here.
  const newArticle = new Article({
    title: "Importance of Kundli in Modern Life",
    content: "Kundli plays a crucial role in understanding personality, career, and relationships. In today's fast-paced world, astrology helps individuals make better decisions by aligning actions with cosmic energies..."
  });

  await newArticle.save();

  res.send("Article added!");
});

module.exports = router;
