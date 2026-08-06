const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Cashfree's exact formula (from their docs):
//   generatedSignature = base64(HMAC_SHA256(timestamp + rawBody, client_secret))
// compared against the x-webhook-signature header. This MUST use the raw,
// unparsed request body — re-serializing parsed JSON can shift number
// formatting (e.g. 170 vs 170.00) and break the signature. app.js captures
// the raw bytes into req.rawBody via express.json's `verify` option before
// this route ever sees the (already-parsed) req.body.
function isValidSignature(rawBody, timestamp, signature) {
  const secret = process.env.CASHFREE_CLIENT_SECRET;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");
  return expected === signature;
}

router.post("/cashfree", async (req, res) => {
  try {
    const timestamp = req.headers["x-webhook-timestamp"];
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.rawBody ? req.rawBody.toString() : null;

    if (!timestamp || !signature || !rawBody || !isValidSignature(rawBody, timestamp, signature)) {
      console.warn("Cashfree webhook: signature verification failed");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Basic replay protection: ignore events older than 5 minutes.
    const eventAgeMs = Date.now() - Number(timestamp) * 1000;
    if (Number.isFinite(eventAgeMs) && eventAgeMs > 5 * 60 * 1000) {
      console.warn("Cashfree webhook: stale event, ignoring");
      return res.status(200).json({ received: true });
    }

    const event = req.body;
    const orderId = event && event.data && event.data.order && event.data.order.order_id;

    if (event.type === "PAYMENT_SUCCESS_WEBHOOK" && orderId) {
      // Atomic + idempotent: only the first caller (webhook or the
      // return-from-checkout page in routes/dashboard.js, whichever wins
      // the race) actually flips status and credits quota.
      const credited = await Transaction.findOneAndUpdate(
        { cfOrderId: orderId, status: { $ne: "success" } },
        { status: "success" },
        { new: true }
      );

      if (credited) {
        await User.findByIdAndUpdate(credited.user, {
          $inc: { questionsLeft: credited.questionsBought }
        });
      }
    } else if (
      (event.type === "PAYMENT_FAILED_WEBHOOK" || event.type === "PAYMENT_USER_DROPPED_WEBHOOK") &&
      orderId
    ) {
      await Transaction.updateOne(
        { cfOrderId: orderId, status: "pending" },
        { status: "failed" }
      );
    }

    // Cashfree expects a fast 2xx response — do heavier work outside the
    // request lifecycle if this ever needs to grow.
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Cashfree webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
