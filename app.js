process.env.TZ = "Asia/Kolkata";

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const { attachUser } = require("./middleware/auth");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// The `verify` hook stashes the exact raw bytes of every JSON request body
// onto req.rawBody. The Cashfree webhook handler needs this — Cashfree
// signs the raw, unparsed payload, and re-serializing req.body after
// JSON.parse can shift number formatting (e.g. 170 vs 170.00) and break
// signature verification. Harmless overhead for every other route.
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Sessions (stored in MongoDB so logins survive server restarts).
// Set SESSION_SECRET in your .env — falls back to a dev-only default.
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));

// Makes `sessionUser` available in every EJS view (used by header.ejs).
app.use(attachUser);

// Routes
const mainRoutes = require("./routes/main");
const adminRoutes = require("./routes/admin");
const kundliRoutes = require("./routes/kundli");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const webhookRoutes = require("./routes/webhooks");

app.use("/", mainRoutes);
app.use("/", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes);
app.use("/api", kundliRoutes);
app.use("/webhooks", webhookRoutes);

// MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.listen(PORT, () => console.log("Server running"));
