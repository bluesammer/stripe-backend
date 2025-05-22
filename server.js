const express = require("express");
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const cors = require("cors");

app.use(cors());
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Track up to 10 URLs",
          },
          unit_amount: 200, // $2.00
        },
        quantity: 1,
      }],
      success_url: "https://example.com/success",  // Replace with your page or Chrome Extension callback
      cancel_url: "https://example.com/cancel",
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
