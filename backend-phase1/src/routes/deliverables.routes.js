const express = require('express');
const { ok, created, fail } = require('../utils/response');

const router = express.Router();

router.get('/', (_req, res) => {
  return ok(res, [
    { id: 'd9000000-0000-0000-0000-000000000001', title: 'Landing Page Build', status: 'completed' },
    { id: 'd9000000-0000-0000-0000-000000000002', title: 'Event QR Print Cards', status: 'in_progress' },
  ]);
});

router.post('/', (req, res) => {
  const { clientOrgId, campaignId, title } = req.body;
  if (!clientOrgId || !campaignId || !title) {
    return fail(res, 'clientOrgId, campaignId, and title are required', 400);
  }

  return created(res, {
    id: 'd9000000-0000-0000-0000-000000000099',
    clientOrgId,
    campaignId,
    title,
    status: 'todo',
  });
});

router.patch('/:deliverableId', (req, res) => {
  return ok(res, { success: true, deliverableId: req.params.deliverableId, updates: req.body });
});

module.exports = router;
