// One-time migration: copies the old hardcoded rashiDataAll object (from
// routes/main.js) into the database. Safe to re-run — checks for each key
// first and only creates what's missing, so it won't stomp on any edits an
// admin has since made through /admin/rashis.
//
// Usage: node scripts/seedRashis.js

require("dotenv").config();
const mongoose = require("mongoose");
const Rashi = require("../models/Rashi");

const rashiDataAll = {
  aries: {
    name: "Aries",
    today: "Today brings a surge of confidence and motivation. You may feel ready to take initiative in both personal and professional matters. Career-wise, it's a great day to start something new or take leadership. Financially, avoid impulsive spending despite opportunities. In love, honest communication will strengthen bonds. Health remains good, but avoid overexertion. Overall, a productive and energetic day awaits you.",
    yearly: {
      career: "Career growth is strong this year with new opportunities.",
      love: "Romantic life improves, communication is key.",
      health: "Focus on fitness and avoid stress.",
      education: "Good year for learning new skills."
    },
    lucky: { color: "Red", number: "9", mood: "Energetic" }
  },
  taurus: {
    name: "Taurus",
    today: "A calm and steady day is ahead. You may feel more focused on stability and long-term planning. Career matters require patience, but your consistency will pay off. Financially, it's a good day to save or invest wisely. In relationships, emotional understanding will strengthen bonds. Health-wise, take care of diet and avoid laziness. Trust the process and stay grounded.",
    yearly: {
      career: "Stable growth, avoid risky decisions.",
      love: "Relationships deepen with trust.",
      health: "Maintain diet discipline.",
      education: "Consistent effort brings success."
    },
    lucky: { color: "Green", number: "6", mood: "Calm" }
  },
  gemini: {
    name: "Gemini",
    today: "Your communication skills will shine today. It's a great day for networking, meetings, or expressing your ideas. Career opportunities may come through conversations. Financially, be cautious with quick decisions. In love, playful interactions bring joy. Health is stable, but mental rest is important. Stay adaptable and open-minded throughout the day.",
    yearly: {
      career: "Growth through networking and communication.",
      love: "Exciting connections and emotional growth.",
      health: "Focus on mental wellness.",
      education: "Excellent for learning and creativity."
    },
    lucky: { color: "Yellow", number: "5", mood: "Curious" }
  },
  cancer: {
    name: "Cancer",
    today: "Emotions may run high today, but they will guide you correctly if handled wisely. Career may feel slow, but patience is key. Financially, avoid unnecessary risks. In love, deep conversations strengthen your bond. Health requires attention to stress and rest. Focus on emotional balance and self-care.",
    yearly: {
      career: "Steady growth with emotional intelligence.",
      love: "Deep emotional connections develop.",
      health: "Take care of stress levels.",
      education: "Good progress with consistency."
    },
    lucky: { color: "White", number: "2", mood: "Sensitive" }
  },
  leo: {
    name: "Leo",
    today: "A powerful and confident day awaits you. Your leadership skills will be noticed. Career-wise, take initiative and shine. Financially, rewards may come from past efforts. In love, your charm attracts attention. Health is good, but avoid ego clashes causing stress. Stay balanced and focused.",
    yearly: {
      career: "Recognition and leadership opportunities.",
      love: "Romantic and passionate year.",
      health: "Maintain energy balance.",
      education: "Strong focus brings success."
    },
    lucky: { color: "Gold", number: "1", mood: "Confident" }
  },
  virgo: {
    name: "Virgo",
    today: "A detail-oriented and productive day lies ahead. You will focus on perfection in your tasks. Career progress comes through discipline. Financially, planning is beneficial. In love, small gestures matter. Health is stable, but avoid overthinking. Keep things simple and organized.",
    yearly: {
      career: "Growth through discipline and planning.",
      love: "Stable and supportive relationships.",
      health: "Avoid stress and overwork.",
      education: "Excellent year for studies."
    },
    lucky: { color: "Blue", number: "5", mood: "Focused" }
  },
  libra: {
    name: "Libra",
    today: "Balance is key today. You may face decisions that require careful thinking. Career brings opportunities if you stay diplomatic. Financially, avoid unnecessary expenses. In love, harmony improves. Health is good but avoid mental stress. Stay calm and maintain balance.",
    yearly: {
      career: "Growth through partnerships.",
      love: "Harmonious relationships.",
      health: "Maintain emotional balance.",
      education: "Good year for creative learning."
    },
    lucky: { color: "Pink", number: "6", mood: "Balanced" }
  },
  scorpio: {
    name: "Scorpio",
    today: "Intensity and determination define your day. You may uncover hidden opportunities. Career growth comes through focus. Financially, avoid secrecy in money matters. In love, passion increases. Health needs attention to emotional stress. Stay grounded and trust your instincts.",
    yearly: {
      career: "Transformational growth.",
      love: "Deep emotional experiences.",
      health: "Manage stress levels.",
      education: "Strong focus leads to success."
    },
    lucky: { color: "Maroon", number: "8", mood: "Intense" }
  },
  sagittarius: {
    name: "Sagittarius",
    today: "Adventure and optimism guide you today. You may feel like exploring new ideas or opportunities. Career growth comes through learning. Financially, avoid careless spending. In love, honesty is important. Health is good, but maintain routine. Stay positive and open-minded.",
    yearly: {
      career: "Growth through expansion and travel.",
      love: "Exciting and adventurous relationships.",
      health: "Stay active and energetic.",
      education: "Excellent year for higher studies."
    },
    lucky: { color: "Purple", number: "3", mood: "Optimistic" }
  },
  capricorn: {
    name: "Capricorn",
    today: "Discipline and responsibility will define your day. Career progress comes through hard work. Financially, stability improves. In love, express your feelings more openly. Health is stable, but avoid overworking. Stay focused and practical.",
    yearly: {
      career: "Strong growth through discipline.",
      love: "Stable but needs emotional expression.",
      health: "Avoid burnout.",
      education: "Consistent effort brings results."
    },
    lucky: { color: "Brown", number: "4", mood: "Determined" }
  },
  aquarius: {
    name: "Aquarius",
    today: "Innovation and creativity will guide your actions. Career opportunities may come through unique ideas. Financially, think before spending. In love, communication is important. Health is good but maintain balance. Trust your originality.",
    yearly: {
      career: "Growth through innovation.",
      love: "Unique and meaningful connections.",
      health: "Maintain mental balance.",
      education: "Great for creative learning."
    },
    lucky: { color: "Cyan", number: "7", mood: "Creative" }
  },
  pisces: {
    name: "Pisces",
    today: "A peaceful and intuitive day awaits. Your instincts will guide you correctly. Career may feel slow but steady. Financially, avoid emotional spending. In love, deep emotional bonding strengthens relationships. Health requires relaxation and rest. Stay calm and trust your inner voice.",
    yearly: {
      career: "Slow but meaningful growth.",
      love: "Deep emotional connections.",
      health: "Focus on relaxation.",
      education: "Creative success."
    },
    lucky: { color: "Sea Green", number: "2", mood: "Dreamy" }
  }
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  for (const [key, data] of Object.entries(rashiDataAll)) {
    // Plain find-then-create instead of findOneAndUpdate+rawResult — the
    // shape of the "raw result" object for findOneAndUpdate has changed
    // across recent MongoDB Node driver versions (that's what caused the
    // TypeError), so this avoids depending on driver-internal result
    // metadata entirely. Functionally identical: never touches a doc that
    // already exists, only creates what's missing.
    const existing = await Rashi.findOne({ key });

    if (existing) {
      console.log(`Already exists, left untouched: ${key}`);
    } else {
      await Rashi.create({ key, ...data });
      console.log(`Created: ${key}`);
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});