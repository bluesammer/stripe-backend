const express = require('express');
const fs = require('fs');
const app = express();
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

const premiumEmails = new Set();

// 🟢 Load saved emails on startup
if (fs.existsSync('premium.json')) {
  const savedEmails = JSON.parse(fs.readFileSync('premium.json'));
  savedEmails.forEach(email => premiumEmails.add(email));
  console.log(`🔁 Loaded ${savedEmails.length} premium emails from file`);
}

// Stripe setup
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');
const endpointSecret = 'YOUR_ENDPOINT_SECRET';

// JSON + raw body for Stripe
app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/json' }));

// Rate limit fix
app.set('trust proxy', 1);
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// ✅ Stripe webhook
app.post('/webhook', (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const email = event.data.object.customer_email;
    if (email) {
      premiumEmails.add(email);
      fs.writeFileSync('premium.json', JSON.stringify([...premiumEmails]));
      console.log(`✅ Added and saved premium email: ${email}`);
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
