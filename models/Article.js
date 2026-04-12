const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String, // NEW
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Article", articleSchema);