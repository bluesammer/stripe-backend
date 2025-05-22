const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for all origins (for localhost testing)
app.use(cors());
app.use(express.json());

// Optional health check
app.get('/', (req, res) => {
  res.send('✅ Stripe backend is running.');
});

// Stripe Checkout session route
app.post('/create-checkout-session', async (req, res) => {
  console.log("✅ Received request:", req.body);

  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Missing amount' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Chrome Extension' },
          unit_amount: amount, // amount in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://google.com',
      cancel_url: 'https://google.com',
    });

    console.log("✅ Stripe session created:", session.url);
    res.json({ url: session.url });

  } catch (err) {
    console.error('❌ Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
