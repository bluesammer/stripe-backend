require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
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
          product_data: { name: 'Chrome Extension Subscription' },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://google.com',
      cancel_url: 'https://google.com',
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));