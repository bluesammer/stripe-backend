const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');

// Health check
app.get('/', (req, res) => {
  res.send('✅ Volume Max Webhook Server is running');
});

// Stripe raw body parser for webhook
app.use(bodyParser.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`✅ Payment received from: ${session.customer_email}`);
  }

  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('🚀 Volume Max Webhook server running on port 3000'));
