const express = require('express');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'Email and password required', 400);
  return ok(res, { success: true, email });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'Email and password required', 400);
  return ok(res, { success: true, email });
});

router.post('/logout', (_req, res) => ok(res, { success: true }));

router.get('/me', (_req, res) => {
  return ok(res, {
    authenticated: true,
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'owner@subjectmedia.com',
    role: 'agency_owner',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  });
});

module.exports = router;
