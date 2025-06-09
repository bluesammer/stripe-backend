const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const premiumEmails = new Set(); // stores premium users in memory

// Stripe setup
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');
const endpointSecret = 'YOUR_ENDPOINT_SECRET';

// To parse JSON
app.use(bodyParser.json());

// Rate limit protection (bypass IP issue for now)
app.set('trust proxy', 1); // fix X-Forwarded-For issue
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// ✅ Stripe webhook
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const email = event.data.object.customer_email;
    if (email) {
      premiumEmails.add(email);
      console.log(`✅ Added premium email: ${email}`);
    }
  }

  res.sendStatus(200);
});

// ✅ Premium checker
app.get('/is-premium', (req, res) => {
  const email = req.query.email;
  const isPremium = premiumEmails.has(email);
  console.log(`🔎 Checked premium for ${email}: ${isPremium}`);
  res.json({ premium: isPremium });
});

app.listen(3000, () => {
  console.log('✅ Server running on port 3000');
});
