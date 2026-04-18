const express = require('express');
const { ok, created, fail } = require('../utils/response');

const router = express.Router();

router.get('/threads', (_req, res) => {
  return ok(res, [
    {
      threadId: 'e9000000-0000-0000-0000-000000000001',
      subject: 'Weekly performance check-in',
      lastMessageAt: new Date().toISOString(),
    },
  ]);
});

router.get('/threads/:threadId', (req, res) => {
  return ok(res, [
    {
      id: 'f9000000-0000-0000-0000-000000000001',
      threadId: req.params.threadId,
      senderUserId: '11111111-1111-1111-1111-111111111111',
      body: 'Great progress this week. Conversions are up 18%.',
      createdAt: new Date().toISOString(),
    },
  ]);
});

router.post('/threads/:threadId', (req, res) => {
  const { body } = req.body;
  if (!body) return fail(res, 'body is required', 400);

  return created(res, {
    id: 'f9000000-0000-0000-0000-000000000099',
    threadId: req.params.threadId,
    senderUserId: '11111111-1111-1111-1111-111111111111',
    body,
    createdAt: new Date().toISOString(),
  });
});

module.exports = router;
