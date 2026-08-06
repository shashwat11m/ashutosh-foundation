// Thin wrapper around the Cashfree Orders API.
// Docs: https://docs.cashfree.com (Payments API v2026-01-01)

const axios = require("axios");

const CASHFREE_BASE_URL = process.env.CASHFREE_ENV === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const API_VERSION = process.env.CASHFREE_API_VERSION || "2026-01-01";

function cfHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": process.env.CASHFREE_CLIENT_ID,
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET
  };
}

// Creates an order and returns Cashfree's response, which includes
// `payment_session_id` — hand that to the frontend SDK to open checkout.
async function createOrder({ orderId, amount, customer, returnUrl, notifyUrl, note }) {
  const { data } = await axios.post(
    `${CASHFREE_BASE_URL}/orders`,
    {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      order_note: note,
      customer_details: {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl
      }
    },
    { headers: cfHeaders() }
  );
  return data;
}

// Looks up an order's current status directly from Cashfree — used as the
// source of truth on the return-from-checkout page, independent of whether
// the webhook has already landed.
async function getOrder(orderId) {
  const { data } = await axios.get(
    `${CASHFREE_BASE_URL}/orders/${orderId}`,
    { headers: cfHeaders() }
  );
  return data; // order_status: ACTIVE | PAID | EXPIRED | TERMINATED
}

module.exports = { createOrder, getOrder, CASHFREE_BASE_URL };
