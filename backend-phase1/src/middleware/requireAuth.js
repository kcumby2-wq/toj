const { fail } = require('../utils/response');

function requireAuth(req, res, next) {
  // Scaffold middleware: replace with real session or JWT validation.
  const hasAuthHeader = Boolean(req.headers.authorization);
  if (!hasAuthHeader) {
    return fail(res, 'Not authenticated', 401);
  }

  req.auth = {
    userId: req.headers['x-user-id'] || null,
    role: req.headers['x-user-role'] || null,
    organizationId: req.headers['x-org-id'] || null,
  };

  return next();
}

module.exports = { requireAuth };
