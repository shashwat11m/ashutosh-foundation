const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// ---------- SIGNUP ----------
router.get("/signup", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  res.render("signup", { error: null });
});

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.render("signup", { error: "All fields are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.render("signup", { error: "An account with this email already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed
      // role defaults to "user", questionsLeft defaults to 3
    });

    await user.save();

    req.session.userId = user._id;
    req.session.name = user.name;
    req.session.role = user.role;

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("signup", { error: "Something went wrong. Please try again." });
  }
});

// ---------- LOGIN ----------
router.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect(req.session.role === "admin" ? "/admin" : "/dashboard");
  }
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
    if (!user) {
      return res.render("login", { error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render("login", { error: "Invalid email or password." });
    }

    req.session.userId = user._id;
    req.session.name = user.name;
    req.session.role = user.role;

    res.redirect(user.role === "admin" ? "/admin" : "/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Something went wrong. Please try again." });
  }
});

// ---------- LOGOUT ----------
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
