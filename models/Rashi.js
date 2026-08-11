const mongoose = require("mongoose");

// The 12 zodiac signs used to live as a hardcoded object literal in
// routes/main.js (rashiDataAll) — moved into the database so the admin can
// actually edit them. See scripts/seedRashis.js for the one-time migration
// of the old hardcoded content into this collection.
const rashiSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, lowercase: true, trim: true }, // "aries", "taurus", ...
  name: { type: String, required: true }, // display name, e.g. "Aries"
  today: { type: String, required: true, default: "" },
  yearly: {
    career: { type: String, default: "" },
    love: { type: String, default: "" },
    health: { type: String, default: "" },
    education: { type: String, default: "" }
  },
  lucky: {
    color: { type: String, default: "" },
    number: { type: String, default: "" },
    mood: { type: String, default: "" }
  }
});

module.exports = mongoose.model("Rashi", rashiSchema);
