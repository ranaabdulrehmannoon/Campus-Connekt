require('dotenv').config();

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const seedUsers = [
  {
    label: 'Admin',
    role: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@nust.edu.pk',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    firstName: process.env.ADMIN_FIRST_NAME || 'System',
    lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
    department: process.env.ADMIN_DEPARTMENT || 'IT Administration',
    batchYear: process.env.ADMIN_BATCH_YEAR || 2026,
  },
  {
    label: 'Student',
    role: 'student',
    email: process.env.STUDENT_EMAIL || 'student@nust.edu.pk',
    password: process.env.STUDENT_PASSWORD || 'Student@123',
    firstName: process.env.STUDENT_FIRST_NAME || 'Test',
    lastName: process.env.STUDENT_LAST_NAME || 'Student',
    department: process.env.STUDENT_DEPARTMENT || 'Computer Science',
    batchYear: process.env.STUDENT_BATCH_YEAR || 2026,
  },
  {
    label: 'Organizer',
    role: 'society_admin',
    email: process.env.ORGANIZER_EMAIL || 'organizer@nust.edu.pk',
    password: process.env.ORGANIZER_PASSWORD || 'Organizer@123',
    firstName: process.env.ORGANIZER_FIRST_NAME || 'Test',
    lastName: process.env.ORGANIZER_LAST_NAME || 'Organizer',
    department: process.env.ORGANIZER_DEPARTMENT || 'Society Affairs',
    batchYear: process.env.ORGANIZER_BATCH_YEAR || 2026,
  },
];

const upsertUserQuery = `
  INSERT INTO users (
    email,
    password_hash,
    role,
    first_name,
    last_name,
    department,
    batch_year,
    is_active,
    is_verified
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
  ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    role = VALUES(role),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    department = VALUES(department),
    batch_year = VALUES(batch_year),
    is_active = VALUES(is_active),
    is_verified = VALUES(is_verified),
    verification_token = NULL,
    reset_token = NULL,
    reset_token_expires = NULL
`;

async function seedUsersAccounts() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    for (const seedUser of seedUsers) {
      const hashedPassword = await bcrypt.hash(seedUser.password, 12);

      await connection.query(upsertUserQuery, [
        seedUser.email,
        hashedPassword,
        seedUser.role,
        seedUser.firstName,
        seedUser.lastName,
        seedUser.department,
        seedUser.batchYear,
      ]);

      console.log(`${seedUser.label} account seeded successfully: ${seedUser.email}`);
      console.log(`Default password: ${seedUser.password}`);
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

seedUsersAccounts().catch((error) => {
  console.error('Failed to seed test accounts:', error.message);
  process.exitCode = 1;
});