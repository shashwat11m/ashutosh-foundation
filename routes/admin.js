const express = require("express");
const router = express.Router();
const Article = require("../models/Article");

// Admin page
router.get("/", (req, res) => {
  res.render("admin");
});

// Post article
router.post("/add", async (req, res) => {
  const { title, content } = req.body;

  const article = new Article({ title, content });
  await article.save();

  res.redirect("/");
});

module.exports = router;