const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing in backend-phase1/.env');
  }

  const schemaPath = path.resolve(__dirname, '..', '..', 'docs', 'phase1', 'phase1-schema.sql');
  const seedPath = path.resolve(__dirname, '..', '..', 'docs', 'phase1', 'phase1-seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // Ensure citext exists before running schema that uses CITEXT columns.
    await client.query('CREATE EXTENSION IF NOT EXISTS citext;');

    console.log('Applying schema...');
    await client.query(schemaSql);

    console.log('Applying seed...');
    await client.query(seedSql);

    console.log('Database bootstrap completed.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Bootstrap failed:', error.message);
  process.exit(1);
});
