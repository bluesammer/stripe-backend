const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const premiumEmails = new Set();

app.use(bodyParser.json());

// Webhook endpoint to listen for Stripe events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;

    if (email) {
      console.log('✅ Premium activated for:', email);
      premiumEmails.add(email.toLowerCase());
    }
  }

  res.status(200).send({ received: true });
});

// Premium check endpoint
app.get('/is-premium', (req, res) => {
  const email = (req.query.email || '').toLowerCase();
  const isPremium = premiumEmails.has(email);
  res.json({ premium: isPremium });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Volume Max Webhook Server is running');
});
