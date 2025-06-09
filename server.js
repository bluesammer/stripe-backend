const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');
const endpointSecret = 'YOUR_STRIPE_ENDPOINT_SECRET';
const admin = require('firebase-admin');
const fs = require('fs');

// 🔐 Firebase setup
const serviceAccount = require('./firebaseKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: 'application/json' }));
app.set('trust proxy', 1);

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
      db.collection('premium_users').doc(email).set({
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Saved ${email} to Firestore`);
    }
  }

  res.sendStatus(200);
});

// ✅ Premium check endpoint
app.get('/is-premium', async (req, res) => {
  const email = req.query.email;
  const doc = await db.collection('premium_users').doc(email).get();
  const isPremium = doc.exists;
  console.log(`🔎 Checked premium for ${email}: ${isPremium}`);
  res.json({ premium: isPremium });
});

app.listen(3000, () => {
  console.log('✅ Server running on port 3000');
});
