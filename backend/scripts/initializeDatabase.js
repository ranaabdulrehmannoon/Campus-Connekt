require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const TARGET_DATABASE = process.env.DB_NAME || 'campus_connekt';
const LEGACY_DATABASE = 'nust_hub';

async function databaseExists(connection, databaseName) {
  const [rows] = await connection.query('SHOW DATABASES LIKE ?', [databaseName]);
  return rows.length > 0;
}

async function executeRoutineBlocks(connection, schemaSql) {
  const routineBlocks = schemaSql.match(/CREATE (?:TRIGGER|PROCEDURE)[\s\S]*?END\$\$/gi) || [];

  for (const block of routineBlocks) {
    const routineStatement = block.replace(/END\$\$/i, 'END');

    try {
      await connection.query(routineStatement);
    } catch (error) {
      console.warn(`⚠️  Routine skipped (may already exist): ${error.message.substring(0, 60)}`);
    }
  }
}

async function migrateLegacyDatabase(serverConnection) {
  if (!(await databaseExists(serverConnection, LEGACY_DATABASE))) {
    console.log(`ℹ️  No legacy database named ${LEGACY_DATABASE} was found`);
    return;
  }

  await serverConnection.query(`CREATE DATABASE IF NOT EXISTS \`${TARGET_DATABASE}\``);

  let sourceConnection;
  let targetConnection;
  let migrationCompleted = false;

  try {
    sourceConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: LEGACY_DATABASE,
    });

    targetConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: TARGET_DATABASE,
    });

    console.log(`🔁 Migrating data from ${LEGACY_DATABASE} into ${TARGET_DATABASE}...`);
    await targetConnection.query('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await sourceConnection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');

    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const [columns] = await sourceConnection.query(`SHOW COLUMNS FROM \`${tableName}\``);
      const columnNames = columns.map((column) => `\`${column.Field}\``);
      const columnList = columnNames.join(', ');
      const updateAssignments = columnNames
        .map((columnName) => `${columnName} = VALUES(${columnName})`)
        .join(', ');

      await targetConnection.query(
        `INSERT INTO \`${TARGET_DATABASE}\`.\`${tableName}\` (${columnList})
         SELECT ${columnList}
         FROM \`${LEGACY_DATABASE}\`.\`${tableName}\`
         ON DUPLICATE KEY UPDATE ${updateAssignments}`,
      );
    }

    await targetConnection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(`✅ Legacy data merged into ${TARGET_DATABASE}`);

    migrationCompleted = true;
  } finally {
    if (sourceConnection) {
      await sourceConnection.end().catch(() => {});
    }

    if (targetConnection) {
      await targetConnection.end().catch(() => {});
    }
  }

  if (migrationCompleted) {
    await serverConnection.query(`DROP DATABASE IF EXISTS \`${LEGACY_DATABASE}\``);
    console.log(`🗑️  Dropped legacy database ${LEGACY_DATABASE}`);
  }
}

async function initializeDatabase() {
  try {
    console.log('🔧 Starting database initialization...');

    // First connection to create database if it doesn't exist
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('✅ Connected to MySQL server');

    // Read and execute main schema file
    const schemaPath = path.join(__dirname, '../..', 'database', 'p.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const schemaStatements = schemaSql.split(';').filter(stmt => stmt.trim());

    console.log('📝 Executing main schema...');
    for (const statement of schemaStatements) {
      if (statement.trim()) {
        try {
          await rootConnection.query(statement);
        } catch (error) {
          console.warn(`⚠️  Query skipped (may already exist): ${error.message.substring(0, 60)}`);
        }
      }
    }
    console.log('✅ Main schema executed');

    // Read and execute security settings file
    const securityPath = path.join(__dirname, '../..', 'database', 'security_settings_tables.sql');
    const securitySql = fs.readFileSync(securityPath, 'utf8');
    const securityStatements = securitySql.split(';').filter(stmt => stmt.trim());

    console.log('📝 Executing security schema...');
    for (const statement of securityStatements) {
      if (statement.trim()) {
        try {
          await rootConnection.query(statement);
        } catch (error) {
          console.warn(`⚠️  Query skipped (may already exist): ${error.message.substring(0, 60)}`);
        }
      }
    }
    console.log('✅ Security schema executed');

    await executeRoutineBlocks(rootConnection, schemaSql);

    await migrateLegacyDatabase(rootConnection);

    await rootConnection.end();

    // Now seed test accounts
    const bcrypt = require('bcryptjs');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to application database');

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

    console.log('🌱 Seeding test accounts...');
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
      console.log(`✅ ${seedUser.label} account created: ${seedUser.email}`);
      console.log(`   Default password: ${seedUser.password}`);
    }

    await connection.end();
    console.log('\n🎉 Database initialization completed successfully!\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exitCode = 1;
  }
}

initializeDatabase();
