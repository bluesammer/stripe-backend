const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");

const app = express();
const port = process.env.PORT || 3000;

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

let premiumEmails = new Set();

app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json()); // For everything else

app.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    if (customerEmail) {
      premiumEmails.add(customerEmail);
      console.log("✅ Premium email added:", customerEmail);
    } else {
      console.warn("❌ No email found in session.");
    }
  }

  res.status(200).send();
});

app.get("/is-premium", (req, res) => {
  const email = req.query.email;
  const isPremium = email && premiumEmails.has(email);
  res.json({ premium: isPremium });
});

app.listen(port, () => {
  console.log(`✅ Volume Max Webhook Server is running on port ${port}`);
});
