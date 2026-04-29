// routes/kundli.js 
const express = require("express");
const router = express.Router();
const axios = require("axios");

const API_KEY = "2a10acqqgQOrw69cs9IrLNhyaOylGf";

router.post("/kundli", async (req, res) => {
  try {
    const { dob, tob, lat, lon, tz } = req.body;

    if (!dob || !tob || !lat || !lon || !tz) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [yyyy, mm, dd] = dob.split("-");
    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const apiDate = `${yyyy}/${mm}/${dd}`;

    const headers = { key: API_KEY };

    const safeFetch = async (url, params) => {
      try {
        const r = await axios.get(url, { params, headers });
        return r.data;
      } catch (err) {
        console.log("❌ API FAIL:", url);
        return null;
      }
    };

    const [d1, d9, planet, sade, mahadasha] = await Promise.all([
      safeFetch("https://api.jyotishamastroapi.com/api/chart_image/d1", {
        date: formattedDate,
        time: tob,
        latitude: lat,
        longitude: lon,
        tz,
        style: "north",
        lang: "en"
      }),

      safeFetch("https://api.jyotishamastroapi.com/api/chart_image/d9", {
        date: formattedDate,
        time: tob,
        latitude: lat,
        longitude: lon,
        tz,
        style: "north",
        lang: "en"
      }),

      safeFetch("https://api.jyotishamastroapi.com/api/horoscope/planet-details", {
        date: apiDate,
        time: tob,
        latitude: lat,
        longitude: lon,
        tz
      }),

      safeFetch("https://api.jyotishamastroapi.com/api/extended_horoscope/current_sadesati", {
        date: apiDate,
        time: tob,
        latitude: lat,
        longitude: lon,
        tz
      }),

      safeFetch("https://api.jyotishamastroapi.com/api/dasha/mahadasha", {
        date: formattedDate,
        time: tob,
        latitude: lat,
        longitude: lon,
        tz
      })
    ]);

    res.json({ d1, d9, planet, sade, mahadasha });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;