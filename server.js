const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Only use raw body on /webhook
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;
    if (email) {
      premiumEmails.add(email);
      console.log("✅ Premium unlocked for:", email);
    }
  }

  res.send();
});

// ✅ Only after webhook route — use JSON for everything else
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is live");
});

app.get("/is-premium", (req, res) => {
  const email = req.query.email;
  res.json({ premium: premiumEmails.has(email) });
});

const premiumEmails = new Set();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
