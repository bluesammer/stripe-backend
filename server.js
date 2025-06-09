const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const premiumEmails = new Set();

// Health check
app.get("/", (req, res) => {
  res.send("Server is up");
});

// Check premium status
app.get("/is-premium", (req, res) => {
  const email = req.query.email;
  res.json({ premium: premiumEmails.has(email) });
});

// MUST use raw body for Stripe webhook verification!
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("⚠️ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;

    if (email) {
      premiumEmails.add(email);
      console.log("✅ Premium email added:", email);
    }
  }

  res.status(200).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server listening on port", PORT);
});
