const express = require("express");
const { isUuid } = require("./_helpers");

const router = express.Router();

router.post("/billing/create-invoice", (req, res) => {
  const { clientOrgId, amount, currency } = req.body || {};

  if (!isUuid(clientOrgId)) {
    return res.status(422).json({ error: "clientOrgId must be a valid uuid" });
  }

  if (amount == null || Number(amount) < 0) {
    return res.status(422).json({ error: "amount must be >= 0" });
  }

  const normalizedCurrency = String(currency || "USD").toUpperCase();
  if (normalizedCurrency.length !== 3) {
    return res.status(422).json({ error: "currency must be a 3-letter code" });
  }

  return res.status(201).json({
    id: "i1111111-1111-4111-8111-111111111111",
    clientOrgId,
    amount: Number(amount),
    currency: normalizedCurrency,
    status: "draft",
  });
});

module.exports = router;
