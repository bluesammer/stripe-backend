const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const emailFile = "./premium-emails.json";

// Load email list from file on startup
let premiumEmails = new Set();
if (fs.existsSync(emailFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(emailFile));
    premiumEmails = new Set(data);
    console.log("📂 Loaded premium emails from file.");
  } catch (err) {
    console.error("⚠️ Failed to load emails from file:", err);
  }
}

// Save email list to file
function savePremiumEmails() {
  fs.writeFileSync(emailFile, JSON.stringify([...premiumEmails]));
}

// Middleware
app.use(helmet());
app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use("/is-premium", limiter);

// Webhook endpoint
app.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Received event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;

    if (email) {
      premiumEmails.add(email);
      savePremiumEmails();
      console.log(`✅ Added premium email: ${email}`);
    }
  }

  res.status(200).send();
});

// Check premium status
app.get("/is-premium", (req, res) => {
  const email = req.query.email;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const isPremium = premiumEmails.has(email);
  console.log(`🔎 Checked premium for ${email}: ${isPremium}`);
  res.json({ premium: isPremium });
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server live on port ${port}`);
});
