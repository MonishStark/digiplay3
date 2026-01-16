/* eslint-disable no-console */

const mysql = require('mysql');
const bcrypt = require('bcrypt');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function query(connection, sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function main() {
  const dbHost = requiredEnv('DATABASE_HOST');
  const dbPort = Number(process.env.DATABASE_PORT || 3306);
  const dbUser = requiredEnv('DATABASE_USER_NAME');
  const dbPassword = process.env.DATABASE_PASSWORD || '';
  const dbName = requiredEnv('DATABASE_NAME');

  const email = requiredEnv('TEST_EMAIL');
  const password = requiredEnv('TEST_PASSWORD');

  const saltRounds = Number(process.env.SALT_ROUND || 10);

  const connection = mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: true,
  });

  await new Promise((resolve, reject) => {
    connection.connect((err) => (err ? reject(err) : resolve()));
  });

  try {
    const existing = await query(
      connection,
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`CI seed: user already exists (id=${userId})`);
    } else {
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const insertUser = await query(
        connection,
        `INSERT INTO users (firstname, lastname, email, mobileCountryCode, mobileNumber, password, accountStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        ['CI', 'User', email, '+1', '0000000000', passwordHash, 1]
      );

      userId = insertUser.insertId;
      console.log(`CI seed: created user (id=${userId})`);
    }

    // Ensure user meta exists for account type (best-effort; ignore if table/constraint differs)
    try {
      await query(
        connection,
        `INSERT INTO users_meta (userId, metaKey, metaValue)
         VALUES (?, 'accountType', 'team')
         ON DUPLICATE KEY UPDATE metaValue = VALUES(metaValue)`,
        [userId]
      );
    } catch {
      // users_meta may not have unique constraint; fallback to insert-if-missing
      const meta = await query(
        connection,
        `SELECT id FROM users_meta WHERE userId = ? AND metaKey = 'accountType' LIMIT 1`,
        [userId]
      );
      if (meta.length === 0) {
        await query(
          connection,
          `INSERT INTO users_meta (userId, metaKey, metaValue)
           VALUES (?, 'accountType', 'team')`,
          [userId]
        );
      }
    }

    // Create (or reuse) a company for the user.
    const existingCompany = await query(
      connection,
      'SELECT id FROM companies WHERE adminId = ? LIMIT 1',
      [userId]
    );

    let companyId;
    if (existingCompany.length > 0) {
      companyId = existingCompany[0].id;
      console.log(`CI seed: company already exists (id=${companyId})`);
    } else {
      const insertCompany = await query(
        connection,
        `INSERT INTO companies (adminId, company_name, company_phone_country_code, company_phone, company_type)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, 'CI Company', '+1', '0000000000', 'CI']
      );
      companyId = insertCompany.insertId;
      console.log(`CI seed: created company (id=${companyId})`);
    }

    // Ensure relationship exists with Administrator role (id=1 in sql/dml.sql)
    const rel = await query(
      connection,
      'SELECT id FROM user_company_role_relationship WHERE userId = ? AND company = ? LIMIT 1',
      [userId, companyId]
    );

    if (rel.length === 0) {
      await query(
        connection,
        `INSERT INTO user_company_role_relationship (userId, company, role)
         VALUES (?, ?, ?)` ,
        [userId, companyId, 1]
      );
      console.log('CI seed: created user_company_role_relationship (Administrator)');
    } else {
      console.log('CI seed: user_company_role_relationship already exists');
    }

    console.log('CI seed: done');
  } finally {
    connection.end();
  }
}

main().catch((err) => {
  console.error('CI seed failed:', err);
  process.exit(1);
});
