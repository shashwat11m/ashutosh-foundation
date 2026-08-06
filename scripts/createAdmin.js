// One-off CLI script to create (or promote) the astrologer/admin account.
// Usage:
//   node scripts/createAdmin.js "Astrologer Name" astrologer@example.com yourPassword

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function run() {
  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.log('Usage: node scripts/createAdmin.js "Astrologer Name" email@example.com yourPassword');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const cleanEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: cleanEmail });

  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`Existing user ${cleanEmail} promoted to admin.`);
  } else {
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email: cleanEmail, password: hashed, role: "admin" });
    console.log(`Admin account created for ${cleanEmail}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
