const { Pool } = require('pg');
const { databaseUrl, nodeEnv } = require('../config/env');

let pool;

function getPool() {
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

async function query(text, params = []) {
  const activePool = getPool();
  if (!activePool) {
    const error = new Error('DATABASE_URL is not configured.');
    error.code = 'DB_NOT_CONFIGURED';
    throw error;
  }
  return activePool.query(text, params);
}

module.exports = {
  query,
  getPool,
};
