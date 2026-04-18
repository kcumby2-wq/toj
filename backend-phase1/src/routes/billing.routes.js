const express = require('express');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.post('/create-invoice', (req, res) => {
  const { clientOrgId, amount, currency } = req.body;
  if (!clientOrgId || !amount || !currency) {
    return fail(res, 'clientOrgId, amount, and currency are required', 400);
  }

  return ok(res, {
    invoiceId: 'a9000000-0000-0000-0000-000000000001',
    stripeInvoiceId: 'in_mock_001',
    status: 'open',
  });
});

router.get('/status', (_req, res) => {
  return ok(res, {
    accountStatus: 'active',
    onboardingStatus: 'completed',
    lastInvoiceStatus: 'paid',
  });
});

router.post('/webhook/stripe', (_req, res) => ok(res, { received: true }));

module.exports = router;
