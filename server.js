const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const fs = require('fs');
const path = require('path');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

// Save emails of paying users
const PREMIUM_FILE = path.join(__dirname, 'premium_users.json');
function addPremiumEmail(email) {
  let users = [];
  if (fs.existsSync(PREMIUM_FILE)) {
    users = JSON.parse(fs.readFileSync(PREMIUM_FILE));
  }
  if (!users.includes(email)) {
    users.push(email);
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify(users));
  }
}

function isPremiumEmail(email) {
  if (!fs.existsSync(PREMIUM_FILE)) return false;
  const users = JSON.parse(fs.readFileSync(PREMIUM_FILE));
  return users.includes(email);
}

// Routes
app.use(express.json());

app.get('/is-premium', (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ premium: false });
  return res.json({ premium: isPremiumEmail(email) });
});

// Stripe webhook
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    if (email) {
      console.log(`✅ Adding premium user: ${email}`);
      addPremiumEmail(email);
    }
  }

  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`✅ Volume Max Webhook Server running on port ${PORT}`));
