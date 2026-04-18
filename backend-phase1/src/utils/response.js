function ok(res, data = {}, status = 200) {
  return res.status(status).json(data);
}

function created(res, data = {}) {
  return res.status(201).json(data);
}

function fail(res, message = 'Unexpected error', status = 400, details) {
  return res.status(status).json({ error: message, details });
}

module.exports = { ok, created, fail };
