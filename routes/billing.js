const express = require("express");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

const router = express.Router();
const SUBSCRIPTIONS_FILE = path.join(__dirname, "..", "db", "subscriptions.json");

function loadSubscriptions() {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveSubscriptions(subscriptions) {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
}

// Plans pricing
const PLANS = {
  free: { name: "Free", price: 0, pagesLimit: 2, stripeId: null },
  pro: { name: "Pro", price: 1000, pagesLimit: 50, stripeId: "price_pro" },
  unlimited: {
    name: "Unlimited",
    price: 2500,
    pagesLimit: 999,
    stripeId: "price_unlimited",
  },
};

// GET /api/billing/subscription - Get user's current plan
router.get("/subscription", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const subscriptions = loadSubscriptions();
  const userSub =
    subscriptions.find((s) => s.email === req.session.userEmail) || null;

  if (!userSub) {
    return res.json({
      plan: "free",
      pagesLimit: PLANS.free.pagesLimit,
      stripeCustomerId: null,
      status: "active",
    });
  }

  res.json({
    plan: userSub.plan,
    pagesLimit: PLANS[userSub.plan].pagesLimit,
    stripeCustomerId: userSub.stripeCustomerId,
    status: userSub.status,
    expiresAt: userSub.expiresAt,
  });
});

// GET /api/billing/plans - Get available plans
router.get("/plans", (req, res) => {
  const plans = Object.entries(PLANS).map(([key, value]) => ({
    id: key,
    name: value.name,
    price: value.price,
    priceFormatted: `$${(value.price / 100).toFixed(2)}/mo`,
    pagesLimit: value.pagesLimit,
  }));

  res.json(plans);
});

// POST /api/billing/upgrade - Upgrade to paid plan (simplified)
router.post("/upgrade", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { plan } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  if (plan === "free") {
    return res.status(400).json({ error: "Cannot upgrade to free plan" });
  }

  const subscriptions = loadSubscriptions();
  const subIndex = subscriptions.findIndex((s) => s.email === req.session.userEmail);

  const newSub = {
    email: req.session.userEmail,
    plan,
    status: "active",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    stripeCustomerId: `cus_${Math.random().toString(36).substring(7)}`,
  };

  if (subIndex === -1) {
    subscriptions.push(newSub);
  } else {
    subscriptions[subIndex] = newSub;
  }

  saveSubscriptions(subscriptions);

  res.json({
    success: true,
    subscription: newSub,
    message: `Upgraded to ${PLANS[plan].name} plan`,
  });
});

// POST /api/billing/cancel - Cancel subscription and downgrade to free
router.post("/cancel", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const subscriptions = loadSubscriptions();
  const subIndex = subscriptions.findIndex((s) => s.email === req.session.userEmail);

  if (subIndex === -1) {
    return res.status(400).json({ error: "No active subscription" });
  }

  subscriptions.splice(subIndex, 1);
  saveSubscriptions(subscriptions);

  res.json({ success: true, message: "Subscription cancelled. Downgraded to free plan." });
});

module.exports = router;
