const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const premiumEmails = new Set();

app.use(bodyParser.json());

// Health check
app.get("/", (req, res) => {
  res.send("✅ Server is live");
});

// Check if email is premium
app.get("/is-premium", (req, res) => {
  const email = req.query.email;
  const isPremium = premiumEmails.has(email);
  res.json({ premium: isPremium });
});

// Stripe webhook
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;

    if (email) {
      premiumEmails.add(email);
      console.log(`✅ Premium unlocked for: ${email}`);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
