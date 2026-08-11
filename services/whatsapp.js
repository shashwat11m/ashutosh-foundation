// services/whatsapp.js
const axios = require("axios");

/**
 * Sends a WhatsApp message to the admin using CallMeBot API
 * @param {Object} leadData - { name, phone, dob, tob, placeOfBirth }
 */
const notifyAdminOfLead = async ({ name, phone, dob, tob, placeOfBirth }) => {
  try {
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER; // e.g., 919876543210
    const apiKey = process.env.CALLMEBOT_API_KEY;

    if (!adminPhone || !apiKey) {
      console.warn("⚠️ WhatsApp env vars missing. Lead will only be saved to DB.");
      return;
    }

    const message = `🔮 *New Kundali Lead!*\n\n*Name:* ${name}\n*Phone:* ${phone}\n*DOB:* ${dob}\n*TOB:* ${tob}\n*Place:* ${placeOfBirth}`;

    // URL Encode the message
    const encodedMsg = encodeURIComponent(message);

    // CallMeBot WhatsApp API endpoint
    const url = `https://api.callmebot.com/whatsapp.php?phone=${adminPhone}&text=${encodedMsg}&apikey=${apiKey}`;

    // Fire and forget
    await axios.get(url);
    console.log("✅ WhatsApp lead notification sent!");
  } catch (err) {
    console.error("❌ WhatsApp notification failed:", err.message);
  }
};

module.exports = { notifyAdminOfLead };