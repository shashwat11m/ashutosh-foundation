// Server-side port of the Rahu Kaal calculation from the original
// rahukaal.js. The original was written to run in a browser: it read
// coordinates from a DOM form and wrote results straight into DOM elements,
// which has no server-side equivalent — so THIS file is a rewrite of just
// that DOM-coupled glue code. The actual math (day is split into 8 equal
// segments between sunrise and sunset; which segment is "Rahu Kaal" depends
// on the day of week) is copied over unchanged from the original.
//
// Original day -> segment-start mapping (0-indexed segment out of 8),
// taken directly from rahukaal.js's changeDate()/initial calculation:
//   Sunday: 7   Monday: 1   Tuesday: 6   Wednesday: 4
//   Thursday: 5 Friday: 3   Saturday: 2
// Rahu Kaal always spans exactly one segment (end = start + 1), matching
// the original (rahuend multiplier is always rahustart multiplier + 1).
const RAHU_SEGMENT_START = [7, 1, 6, 4, 5, 3, 2]; // indexed by Date#getDay()

const SunCalc = require("./suncalc");

// Returns { sunrise, sunset, ...all other SunCalc.getTimes() fields } for
// the given date/location.
function getSunTimes(date, lat, lng) {
  return SunCalc.getTimes(date, lat, lng);
}

// Returns { start: Date, end: Date } for Rahu Kaal on the given date/location.
function getRahuKaal(date, lat, lng) {
  const times = SunCalc.getTimes(date, lat, lng);
  const sunriseMs = times.sunrise.getTime();
  const sunsetMs = times.sunset.getTime();

  // Same formula as the original: the day (sunrise to sunset) split into
  // 8 equal segments.
  const segmentMs = Math.abs(sunsetMs - sunriseMs) / 8;

  const dow = date.getDay(); // 0 = Sunday ... 6 = Saturday
  const segmentStart = RAHU_SEGMENT_START[dow];

  const start = new Date(sunriseMs + segmentMs * segmentStart);
  const end = new Date(sunriseMs + segmentMs * (segmentStart + 1));

  return { start, end };
}

module.exports = { getSunTimes, getRahuKaal };
