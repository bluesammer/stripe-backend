const express = require("express");
const fs = require("fs");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.use(bodyParser.json());

const USERS_FILE = "premium_users.json";

// Load or initialize premium users list
let premiumUsers = [];
if (fs.existsSync(USERS_FILE)) {
  premiumUsers = JSON.parse(fs.readFileSync(USERS_FILE));
}

// 🔒 Webhook: Save user on payment success
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log("Webhook signature verification failed:", err.message);
    return res.sendStatus(400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;

    if (email && !premiumUsers.includes(email)) {
      premiumUsers.push(email);
      fs.writeFileSync(USERS_FILE, JSON.stringify(premiumUsers, null, 2));
      console.log("✅ New premium user added:", email);
    }
  }

  res.sendStatus(200);
});

// 🔍 Endpoint: Check if user is premium
app.get("/is-premium", (req, res) => {
  const email = req.query.email?.toLowerCase();
  if (!email) return res.status(400).json({ error: "Missing email" });

  const isPremium = premiumUsers.includes(email);
  res.json({ premium: isPremium });
});

// 🔘 Home route
app.get("/", (req, res) => {
  res.send("✅ Volume Max Webhook Server is running");
});

app.listen(port, () => {
  console.log(`🔊 Server running on port ${port}`);
});
