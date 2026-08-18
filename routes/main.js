const express = require("express");
const router = express.Router();
const { getPanchangForDate } = require("../services/panchangService");
const Article = require("../models/Article");
const Rashi = require("../models/Rashi");
const { SITE_URL, excerpt } = require("../lib/seo");

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

  const meta = {
    title: "Ashutosh Foundation | Vedic Astrology, Numerology, Panchang & Kundli",
    description: "Get free daily panchang, name numerology, kundli and rashi horoscopes. Consult Vedic astrologer Ashutosh Mishra for career guidance and life counselling.",
    image: "/images/logo.png",
    url: SITE_URL + "/",
    keywords: "free kundli, astrology, numerology, panchang, horoscope, rashi, astrologer in India"
  };

  res.render("home", { articles, rashiDataAll, panchang, googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "", meta });
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

  const meta = {
    title: "Daily Panchang | Today's Panchang, Tithi, Nakshatra & Rahu Kaal",
    description: "Check today's Panchang with tithi, nakshatra, yoga, weekday and Rahu Kaal for any date. Accurate Vedic panchang by Ashutosh Foundation.",
    image: "/images/logo.png",
    url: SITE_URL + "/panchang",
    keywords: "panchang, today panchang, tithi, nakshatra, rahu kaal, hindu calendar"
  };

  res.render("panchang", {
    panchang,
    dateInputValue,
    prevDate: prev.toISOString().slice(0, 10),
    nextDate: next.toISOString().slice(0, 10),
    meta
  });
});

// Personalised Numerology Report
router.get("/numerology", (req, res) => {
  const meta = {
    title: "Numerology Report — Personalised Reading | Ashutosh Foundation",
    description: "Generate your personalised numerology report. Calculate your Radical, Destiny and Name numbers using Chaldean, Pythagorean, Cheiro, Sepherial or Modern systems. Get detailed interpretations, favourable attributes, career guidance, remedies and more.",
    image: "/images/logo.png",
    url: SITE_URL + "/numerology",
    keywords: "numerology report, numerology calculator, chaldean numerology, pythagorean numerology, radical number, destiny number, name number, numerology reading"
  };
  res.render("numerology", { meta });
});

// Rashi page
router.get("/rashi/:name", async (req, res) => {
  const key = req.params.name.toLowerCase();
  const rashiData = (await Rashi.findOne({ key })) || (await Rashi.findOne({ key: "aries" }));
  const rashiName = key.charAt(0).toUpperCase() + key.slice(1);

  const meta = {
    title: rashiName + " Horoscope Today & 2026 | Ashutosh Foundation",
    description: rashiData ? excerpt(rashiData.today, 160) : "Read " + rashiName + " horoscope, lucky numbers, colors and today's predictions by Ashutosh Foundation.",
    image: "/images/zodiac/" + key + ".png",
    url: SITE_URL + "/rashi/" + key,
    keywords: rashiName.toLowerCase() + " horoscope, rashi, rashifal, today horoscope, 2026 horoscope"
  };

  res.render("rashi", { rashi: key, rashiData, meta });
});

router.get("/article/:id", async (req, res) => {
  const article = await Article.findById(req.params.id);

  if (!article) {
    return res.status(404).send("Article not found");
  }

  const meta = {
    title: article.title + " | Ashutosh Foundation",
    description: excerpt(article.content, 160),
    image: article.image ? SITE_URL + "/uploads/" + article.image : SITE_URL + "/images/logo.png",
    url: SITE_URL + "/article/" + article._id,
    type: "article",
    keywords: "astrology, vedic astrology, kundli, horoscope, " + article.title
  };

  res.render("article", { article, meta });
});

router.get("/articles", async (req, res) => {
  const articles = await Article.find().sort({ date: -1 });

  const meta = {
    title: "Articles & Astrology Blogs | Ashutosh Foundation",
    description: "Read in-depth articles on Vedic astrology, kundli, numerology, panchang and horoscopes by Ashutosh Foundation.",
    image: "/images/logo.png",
    url: SITE_URL + "/articles",
    keywords: "astrology articles, astrology blog, vedic astrology, kundli articles"
  };

  res.render("all-articles", { articles, meta });
});

router.get("/contact-us", (req, res) => {
  const meta = {
    title: "Contact Us | Ashutosh Foundation",
    description: "Get in touch with astrologer Ashutosh Mishra for astrology, numerology and career counselling consultations.",
    url: SITE_URL + "/contact-us"
  };
  res.render("contact-us", { meta });
});

router.get("/terms-and-conditions", (req, res) => {
  const meta = {
    title: "Terms & Conditions | Ashutosh Foundation",
    description: "Read the terms and conditions for using Ashutosh Foundation's astrology and consultation services.",
    url: SITE_URL + "/terms-and-conditions"
  };
  res.render("terms-and-conditions", { meta });
});

router.get("/cancellation-and-refund", (req, res) => {
  const meta = {
    title: "Cancellation & Refund Policy | Ashutosh Foundation",
    description: "Understand the cancellation and refund policy for consultations and services offered by Ashutosh Foundation.",
    url: SITE_URL + "/cancellation-and-refund"
  };
  res.render("cancellation-and-refund", { meta });
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
