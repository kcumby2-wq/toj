const express = require('express');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.post('/start', (req, res) => {
  const { companyName, contactEmail } = req.body;
  if (!companyName || !contactEmail) return fail(res, 'companyName and contactEmail are required', 400);
  return ok(res, { success: true, onboardingStatus: 'started' });
});

router.post('/complete', (req, res) => {
  const { clientOrgId } = req.body;
  if (!clientOrgId) return fail(res, 'clientOrgId is required', 400);
  return ok(res, { success: true, onboardingStatus: 'completed' });
});

module.exports = router;
