require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Routes
const mainRoutes = require("./routes/main");
const adminRoutes = require("./routes/admin");
const kundliRoutes = require("./routes/kundli");

app.use("/", mainRoutes);
app.use("/admin", adminRoutes);
app.use("/api", kundliRoutes);

// MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.listen(PORT, () => console.log("Server running"));