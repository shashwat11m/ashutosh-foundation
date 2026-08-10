// Orchestrates the ported panchang.js + suncalc.js + rahukaal.js into one
// clean call. All calculations are anchored to New Delhi's coordinates —
// same as the original calculator (panchang.htm literally labelled itself
// "New Delhi, India") — so results match what that calculator produced.
//
// IMPORTANT: this only works correctly if the Node process's local
// timezone is IST (Asia/Kolkata). See the process.env.TZ line at the very
// top of app.js — without it, a server hosted in UTC (the common default)
// would compute panchang for the wrong wall-clock time, potentially
// shifting tithi/nakshatra boundaries or even which day is shown.

const panchang = require("../lib/panchang/panchang");
const { getSunTimes, getRahuKaal } = require("../lib/panchang/rahukaal");

const NEW_DELHI = { lat: 28.6139, lng: 77.2 };

const SANSKRIT_WEEKDAY = {
  Sunday: "Ravivara",
  Monday: "Somavara",
  Tuesday: "Mangalavara",
  Wednesday: "Budhavara",
  Thursday: "Guruvara",
  Friday: "Shukravara",
  Saturday: "Shanivara"
};

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Simple same-day cache — the underlying math only depends on the
// calendar date + fixed coordinates, so there's no reason to recompute the
// trig for every homepage/panchang-page hit on the same day.
const cache = new Map();

function getPanchangForDate(date) {
  const cacheKey = date.toDateString(); // day-level granularity is enough

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const sunTimes = getSunTimes(date, NEW_DELHI.lat, NEW_DELHI.lng);
  const moonTimes = require("../lib/panchang/suncalc").getMoonTimes(date, NEW_DELHI.lat, NEW_DELHI.lng);
  const rahuKaal = getRahuKaal(date, NEW_DELHI.lat, NEW_DELHI.lng);

  let result;
  panchang.calculate(date, () => {
    result = {
      date,
      weekday: panchang.Day.name,
      weekdaySanskrit: SANSKRIT_WEEKDAY[panchang.Day.name] || panchang.Day.name,

      tithi: {
        name: panchang.Tithi.name,
        paksha: panchang.Tithi.paksha,
        endsAt: formatTime(panchang.Tithi.end)
      },
      nakshatra: {
        name: panchang.Nakshatra.name,
        endsAt: formatTime(panchang.Nakshatra.end)
      },
      karna: {
        name: panchang.Karna.name,
        endsAt: formatTime(panchang.Karna.end)
      },
      yoga: {
        name: panchang.Yoga.name,
        endsAt: formatTime(panchang.Yoga.end)
      },
      raasi: panchang.Raasi.name,
      ayanamsa: panchang.Ayanamsa.name,

      sunrise: formatTime(sunTimes.sunrise),
      sunset: formatTime(sunTimes.sunset),
      moonrise: moonTimes.rise ? formatTime(moonTimes.rise) : "—",
      moonset: moonTimes.set ? formatTime(moonTimes.set) : "—",
      dayDuration: formatDuration(sunTimes.sunset - sunTimes.sunrise),

      rahuKaal: {
        start: formatTime(rahuKaal.start),
        end: formatTime(rahuKaal.end)
      }
    };
  });

  cache.set(cacheKey, result);
  return result;
}

module.exports = { getPanchangForDate, NEW_DELHI };
