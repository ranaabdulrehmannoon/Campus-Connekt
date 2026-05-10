const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { generateToken } = require('../config/auth');
const { notifyAdmins } = require('../utils/notificationService');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { syncUserToMongoDB, updateUserInMongoDB } = require('../sync/userSync');

const avatarUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadsDir)) {
  fs.mkdirSync(avatarUploadsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${req.user.userId}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const ALLOWED_EMAIL_SUFFIXES = [
  '@nust.edu.pk',
  '@edu.pk',
  '@seecs.edu.pk',
  '@smme.edu.pk',
  '@scme.edu.pk',
  '@sada.edu.pk',
  '@sns.edu.pk',
  '@nbs.edu.pk',
  '@igis.edu.pk',
  '@nice.edu.pk',
  '@nipcons.edu.pk',
  '@asab.edu.pk',
];
const isUniversityEmail = (email) => ALLOWED_EMAIL_SUFFIXES.some((suffix) => normalizeEmail(email).endsWith(suffix));
const allowedSuffixesLabel = ALLOWED_EMAIL_SUFFIXES.join(', ');
const normalizeSecurityAnswer = (answer) => String(answer || '').trim().toLowerCase();
let securitySchemaEnsured = false;
let userApprovalSchemaEnsured = false;
let emailVerificationCodeSchemaEnsured = false;

const generateVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizeOptionalText = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const normalizeBatchYear = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 1901 || parsed > 2155) {
    return Number.NaN;
  }

  return parsed;
};

const normalizeRequestedRole = (role) => {
  const value = String(role || 'student').trim().toLowerCase();
  if (value === 'organizer') return 'society_admin';
  if (value === 'society_admin') return 'society_admin';
  if (value === 'visitor') return 'student';
  if (value === 'student') return 'student';
  return null;
};

const ensureUserApprovalSchema = async (connection) => {
  if (userApprovalSchemaEnsured) return;

  const [columnRows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('requested_role', 'approval_status', 'approved_by', 'approved_at', 'approval_requested_at')`
  );

  const existingColumns = new Set(columnRows.map((row) => row.COLUMN_NAME));
  const alterStatements = [];

  if (!existingColumns.has('requested_role')) {
    alterStatements.push(`ALTER TABLE users ADD COLUMN requested_role ENUM('student', 'society_admin') NULL AFTER role`);
  }

  if (!existingColumns.has('approval_status')) {
    alterStatements.push(`ALTER TABLE users ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER is_verified`);
  }

  if (!existingColumns.has('approved_by')) {
    alterStatements.push(`ALTER TABLE users ADD COLUMN approved_by INT UNSIGNED NULL AFTER approval_status`);
  }

  if (!existingColumns.has('approved_at')) {
    alterStatements.push(`ALTER TABLE users ADD COLUMN approved_at DATETIME NULL AFTER approved_by`);
  }

  if (!existingColumns.has('approval_requested_at')) {
    alterStatements.push(`ALTER TABLE users ADD COLUMN approval_requested_at DATETIME NULL AFTER approved_at`);
  }

  for (const statement of alterStatements) {
    await connection.query(statement);
  }

  userApprovalSchemaEnsured = true;
};

const ensureEmailVerificationCodeSchema = async (connection) => {
  if (emailVerificationCodeSchemaEnsured) return;

  const [columnRows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN ('verification_code_hash', 'verification_code_expires')`
  );

  const existingColumns = new Set(columnRows.map((row) => row.COLUMN_NAME));

  if (!existingColumns.has('verification_code_hash')) {
    await connection.query('ALTER TABLE users ADD COLUMN verification_code_hash VARCHAR(255) NULL AFTER verification_token');
  }

  if (!existingColumns.has('verification_code_expires')) {
    await connection.query('ALTER TABLE users ADD COLUMN verification_code_expires DATETIME NULL AFTER verification_code_hash');
  }

  emailVerificationCodeSchemaEnsured = true;
};

const ensureSecuritySchema = async (connection) => {
  if (securitySchemaEnsured) return;

  await connection.query(
    `CREATE TABLE IF NOT EXISTS security_questions (
        question_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question_text  VARCHAR(255) NOT NULL,
        is_active      TINYINT(1) NOT NULL DEFAULT 1,
        display_order  INT UNSIGNED NOT NULL DEFAULT 0,
        created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_security_question_text (question_text),
        INDEX idx_security_question_active_order (is_active, display_order)
    )`
  );

  await connection.query(
    `CREATE TABLE IF NOT EXISTS user_security_questions (
        user_security_question_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id                   INT UNSIGNED NOT NULL,
        question_id               INT UNSIGNED NOT NULL,
        answer_hash               VARCHAR(255) NOT NULL,
        created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_usq_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_usq_question FOREIGN KEY (question_id) REFERENCES security_questions(question_id) ON DELETE RESTRICT,
        UNIQUE KEY uq_user_question (user_id, question_id),
        INDEX idx_usq_user (user_id),
        INDEX idx_usq_question (question_id)
    )`
  );

  await connection.query(
    `INSERT INTO security_questions (question_text, is_active, display_order)
     VALUES
      ('What was your childhood nickname?', 1, 1),
      ('What is the name of your first school?', 1, 2),
      ('What city were you born in?', 1, 3),
      ('What is your favorite teacher''s last name?', 1, 4),
      ('What was your first pet''s name?', 1, 5),
      ('What is your mother''s middle name?', 1, 6)
     ON DUPLICATE KEY UPDATE
      is_active = VALUES(is_active),
      display_order = VALUES(display_order)`
  );

  securitySchemaEnsured = true;
};

const register = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await ensureUserApprovalSchema(connection);
    await ensureEmailVerificationCodeSchema(connection);

    const email = normalizeEmail(req.body.email);
    const { password, firstName, lastName, department, batchYear } = req.body;
    const requestedRole = normalizeRequestedRole(req.body.role);
    const normalizedDepartment = normalizeOptionalText(department);
    const normalizedBatchYear = normalizeBatchYear(batchYear);

    if (Number.isNaN(normalizedBatchYear)) {
      return res.status(400).json({
        success: false,
        message: 'Batch year must be a valid year between 1901 and 2155'
      });
    }

    if (!requestedRole) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected during registration'
      });
    }

    const requiresAdminApproval = requestedRole === 'society_admin';
    const initialApprovalStatus = requiresAdminApproval ? 'pending' : 'approved';
    const initialActiveState = requiresAdminApproval ? 0 : 1;

    if (!isUniversityEmail(email)) {
      return res.status(400).json({
        success: false,
        message: `Use an approved university email suffix: ${allowedSuffixesLabel}`
      });
    }

    // Check if user exists
    const [existing] = await connection.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate NUST email
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Insert user
    const [result] = await connection.query(
      `INSERT INTO users 
       (email, password_hash, role, requested_role, first_name, last_name, department, batch_year,
        verification_token, verification_code_hash, verification_code_expires,
        is_active, approval_status, approval_requested_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashedPassword,
        requestedRole,
        requiresAdminApproval ? requestedRole : null,
        firstName,
        lastName,
        normalizedDepartment,
        normalizedBatchYear,
        verificationToken,
        verificationCodeHash,
        verificationCodeExpires,
        initialActiveState,
        initialApprovalStatus,
        requiresAdminApproval ? new Date() : null,
      ]
    );

    // Sync to MongoDB
    const userData = {
      user_id: result.insertId,
      email,
      password_hash: hashedPassword,
      role: requestedRole,
      first_name: firstName,
      last_name: lastName,
      department: normalizedDepartment,
      batch_year: normalizedBatchYear,
      verification_token: verificationToken,
      verification_code_hash: verificationCodeHash,
      verification_code_expires: verificationCodeExpires,
      is_active: initialActiveState === 1,
      approval_status: initialApprovalStatus,
      requested_role: requiresAdminApproval ? requestedRole : null,
      approval_requested_at: requiresAdminApproval ? new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await syncUserToMongoDB(userData);

    if (requiresAdminApproval) {
      await notifyAdmins(connection, {
        title: 'Organizer Account Approval Needed',
        message: `${firstName} ${lastName} requested organizer/society admin access.`,
        type: 'admin_alert',
        referenceId: result.insertId,
        referenceType: 'user',
      });
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, verificationCode);

    if (requiresAdminApproval) {
      return res.status(201).json({
        success: true,
        requiresApproval: true,
        requiresVerification: true,
        message: emailSent
          ? 'Registration successful. Enter the verification code sent to your email. Your organizer account is also pending admin approval.'
          : 'Registration successful. Enter the verification code shown by the server log. Your organizer account is also pending admin approval.',
        user: {
          id: result.insertId,
          email,
          firstName,
          lastName,
          role: requestedRole,
          approvalStatus: 'pending',
        },
      });
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: emailSent
        ? 'Registration successful. Enter the verification code sent to your email before logging in.'
        : 'Registration successful. Enter the verification code shown by the server log before logging in.',
      user: {
        id: result.insertId,
        email,
        firstName,
        lastName,
        role: requestedRole,
        approvalStatus: initialApprovalStatus,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user'
    });
  } finally {
    connection.release();
  }
};

const login = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await ensureUserApprovalSchema(connection);

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    // Get user
    const [users] = await connection.query(
      `SELECT user_id, email, password_hash, role, first_name, last_name,
              is_active, is_verified, approval_status, requested_role
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    if (user.role !== 'admin' && !user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.'
      });
    }

    if (user.approval_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your organizer account is pending admin approval.'
      });
    }

    if (user.approval_status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your organizer account request was rejected. Contact admin.'
      });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact admin.'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await connection.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    // Generate token
    const token = generateToken(user.user_id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isVerified: user.is_verified,
        approvalStatus: user.approval_status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  } finally {
    connection.release();
  }
};

const forgotPassword = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!isUniversityEmail(email)) {
      return res.status(400).json({
        success: false,
        message: `Use an approved university email suffix: ${allowedSuffixesLabel}`
      });
    }

    const [userRows] = await connection.query(
      `SELECT user_id
       FROM users
       WHERE email = ?
         AND is_active = 1
       LIMIT 1`,
      [email]
    );

    if (userRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active account found with that email.'
      });
    }

    const userId = userRows[0].user_id;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await connection.query(
      `UPDATE users
       SET reset_token = ?,
           reset_token_expires = ?
       WHERE user_id = ?`,
      [resetToken, tokenExpires, userId]
    );

    const emailSent = await sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: emailSent
        ? 'A password reset link has been sent to your email.'
        : 'SMTP not configured - reset token shown in server logs.',
      ...(process.env.NODE_ENV !== 'production' && !emailSent ? { resetToken } : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting password reset'
    });
  } finally {
    connection.release();
  }
};

const resetPassword = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '').trim();

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Reset code and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await connection.query('CALL sp_reset_password(?, ?, @p_message)', [token, hashedPassword]);
    const [resultRows] = await connection.query('SELECT @p_message AS message');
    const resetMessage = resultRows[0]?.message || 'Unable to reset password';

    if (resetMessage !== 'Password reset successfully.') {
      return res.status(400).json({
        success: false,
        message: resetMessage
      });
    }

    res.json({
      success: true,
      message: resetMessage
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  } finally {
    connection.release();
  }
};

const verifyEmail = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await ensureEmailVerificationCodeSchema(connection);

    const { token } = req.params;

    const [result] = await connection.query(
      `UPDATE users
       SET is_verified = 1,
           verification_token = NULL,
           verification_code_hash = NULL,
           verification_code_expires = NULL
       WHERE verification_token = ?`,
      [token]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  } finally {
    connection.release();
  }
};

const verifyEmailCode = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureEmailVerificationCodeSchema(connection);

    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const [rows] = await connection.query(
      `SELECT user_id, is_verified, verification_code_hash, verification_code_expires
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found for this email'
      });
    }

    const user = rows[0];

    if (user.is_verified) {
      return res.json({
        success: true,
        message: 'Email is already verified'
      });
    }

    if (!user.verification_code_hash || !user.verification_code_expires) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found. Please request a new code.'
      });
    }

    if (new Date(user.verification_code_expires).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    const isValidCode = await bcrypt.compare(code, user.verification_code_hash);
    if (!isValidCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    await connection.query(
      `UPDATE users
       SET is_verified = 1,
           verification_token = NULL,
           verification_code_hash = NULL,
           verification_code_expires = NULL
       WHERE user_id = ?`,
      [user.user_id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email code'
    });
  } finally {
    connection.release();
  }
};

const resendVerificationCode = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureEmailVerificationCodeSchema(connection);

    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const [rows] = await connection.query(
      `SELECT user_id, is_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found for this email'
      });
    }

    if (rows[0].is_verified) {
      return res.json({
        success: true,
        message: 'Email is already verified'
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = await bcrypt.hash(verificationCode, 10);
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    await connection.query(
      `UPDATE users
       SET verification_token = ?,
           verification_code_hash = ?,
           verification_code_expires = ?
       WHERE user_id = ?`,
      [verificationToken, verificationCodeHash, verificationCodeExpires, rows[0].user_id]
    );

    const emailSent = await sendVerificationEmail(email, verificationToken, verificationCode);

    res.json({
      success: true,
      message: emailSent
        ? 'A new verification code was sent to your email.'
        : 'Verification code generated. SMTP is not configured; use the code from server logs.'
    });
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending verification code'
    });
  } finally {
    connection.release();
  }
};

const getMe = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [users] = await connection.query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name, u.role, u.department, 
              u.batch_year, u.bio, u.profile_picture, u.is_verified,
              COUNT(DISTINCT er.registration_id) as events_joined,
              COUNT(DISTINCT r.resource_id) as resources_uploaded,
              COUNT(DISTINCT sm.membership_id) as societies_joined
       FROM users u
       LEFT JOIN event_registrations er ON er.user_id = u.user_id AND er.status = 'confirmed'
       LEFT JOIN resources r ON r.uploaded_by = u.user_id AND r.status = 'approved'
       LEFT JOIN society_members sm ON sm.user_id = u.user_id AND sm.is_active = 1
       WHERE u.user_id = ?
       GROUP BY u.user_id`,
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  } finally {
    connection.release();
  }
};

const getProfile = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.userId;

    const [profileResult, joinedEventsResult, uploadedResourcesResult, societyMembershipResult, activityResult] = await Promise.all([
      connection.query(
        `SELECT *
         FROM vw_user_profile
         WHERE user_id = ?`,
        [userId]
      ),
      connection.query(
        `SELECT
           er.registration_id,
           er.registered_at,
           er.status,
           e.event_id,
           e.title,
           e.start_datetime,
           e.end_datetime,
           e.location,
           e.category,
           COALESCE(s.name, 'Independent Event') AS society_name
         FROM event_registrations er
         JOIN events e ON e.event_id = er.event_id
         LEFT JOIN societies s ON s.society_id = e.society_id
         WHERE er.user_id = ?
         ORDER BY er.registered_at DESC`,
        [userId]
      ),
      connection.query(
        `SELECT
           r.resource_id,
           r.title,
           r.subject,
           r.course_code,
           r.resource_type,
           r.status,
           r.download_count,
           r.created_at,
           r.approved_at
         FROM resources r
         WHERE r.uploaded_by = ?
         ORDER BY r.created_at DESC`,
        [userId]
      ),
      connection.query(
        `SELECT
           sm.membership_id,
           sm.role,
           sm.is_active,
           sm.joined_at,
           s.society_id,
           s.name,
           s.category,
           s.logo,
           s.is_approved
         FROM society_members sm
         JOIN societies s ON s.society_id = sm.society_id
         WHERE sm.user_id = ?
         ORDER BY sm.joined_at DESC`,
        [userId]
      ),
      connection.query(
        `SELECT
           activity_type,
           title,
           description,
           created_at,
           reference_id,
           reference_type
         FROM (
           SELECT
             'event_registration' AS activity_type,
             e.title,
             CONCAT('Registered for ', e.title, ' as ', er.status) AS description,
             er.registered_at AS created_at,
             er.event_id AS reference_id,
             'event' AS reference_type
           FROM event_registrations er
           JOIN events e ON e.event_id = er.event_id
           WHERE er.user_id = ?

           UNION ALL

           SELECT
             'resource_upload' AS activity_type,
             r.title,
             CONCAT('Uploaded ', r.resource_type, ' resource') AS description,
             r.created_at AS created_at,
             r.resource_id AS reference_id,
             'resource' AS reference_type
           FROM resources r
           WHERE r.uploaded_by = ?

           UNION ALL

           SELECT
             'society_membership' AS activity_type,
             s.name,
             CONCAT('Joined society as ', sm.role) AS description,
             sm.joined_at AS created_at,
             sm.society_id AS reference_id,
             'society' AS reference_type
           FROM society_members sm
           JOIN societies s ON s.society_id = sm.society_id
           WHERE sm.user_id = ?

           UNION ALL

           SELECT
             'profile_update' AS activity_type,
             'Profile updated' AS title,
             CONCAT('Updated profile fields: ', action) AS description,
             created_at,
             record_id AS reference_id,
             'user' AS reference_type
           FROM audit_log
           WHERE actor_id = ?
             AND table_name = 'users'
             AND action = 'profile_updated'
         ) AS activity_feed
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId, userId, userId, userId]
      ),
    ]);

    const profileRows = profileResult[0];
    const joinedEventsRows = joinedEventsResult[0];
    const uploadedResourcesRows = uploadedResourcesResult[0];
    const societyMembershipRows = societyMembershipResult[0];
    const activityRows = activityResult[0];

    const profile = profileRows[0] || null;

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      profile,
      joinedEvents: joinedEventsRows,
      uploadedResources: uploadedResourcesRows,
      societyMemberships: societyMembershipRows,
      activityHistory: activityRows,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile data'
    });
  } finally {
    connection.release();
  }
};

const updateProfile = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.userId;
    const { firstName, lastName, department, batchYear, bio, phone, profilePicture } = req.body;

    const [currentRows] = await connection.query(
      `SELECT first_name, last_name, department, batch_year, bio, phone, profile_picture
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = currentRows[0];
    const updatedValues = {
      first_name: firstName ?? currentUser.first_name,
      last_name: lastName ?? currentUser.last_name,
      department: department ?? currentUser.department,
      batch_year: batchYear === '' || batchYear === null || batchYear === undefined ? currentUser.batch_year : batchYear,
      bio: bio ?? currentUser.bio,
      phone: phone ?? currentUser.phone,
      profile_picture: profilePicture ?? currentUser.profile_picture,
    };

    await connection.query(
      `UPDATE users
       SET first_name = ?,
           last_name = ?,
           department = ?,
           batch_year = ?,
           bio = ?,
           phone = ?,
           profile_picture = ?
       WHERE user_id = ?`,
      [
        updatedValues.first_name,
        updatedValues.last_name,
        updatedValues.department,
        updatedValues.batch_year,
        updatedValues.bio,
        updatedValues.phone,
        updatedValues.profile_picture,
        userId,
      ]
    );

    // Sync to MongoDB
    await updateUserInMongoDB(userId, updatedValues);

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data)
       VALUES (?, 'profile_updated', 'users', ?, ?, ?)`,
      [
        userId,
        userId,
        JSON.stringify(currentUser),
        JSON.stringify(updatedValues),
      ]
    );

    const [updatedRows] = await connection.query(
      `SELECT *
       FROM vw_user_profile
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedRows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  } finally {
    connection.release();
  }
};

const uploadAvatar = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    const userId = req.user.userId;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const [rows] = await connection.query(
      'SELECT profile_picture FROM users WHERE user_id = ?',
      [userId]
    );

    // Delete old avatar file if it exists on disk
    if (rows[0]?.profile_picture) {
      const oldPath = path.join(__dirname, '..', '..', rows[0].profile_picture);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await connection.query(
      'UPDATE users SET profile_picture = ? WHERE user_id = ?',
      [avatarUrl, userId]
    );

    res.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: 'Error uploading avatar' });
  } finally {
    connection.release();
  }
};

const changePassword = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.userId;
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const [rows] = await connection.query(
      `SELECT password_hash
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await connection.query(
      `UPDATE users
       SET password_hash = ?
       WHERE user_id = ?`,
      [passwordHash, userId]
    );

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id)
       VALUES (?, 'password_changed', 'users', ?)`,
      [userId, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  } finally {
    connection.release();
  }
};

const getSecurityQuestions = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureSecuritySchema(connection);

    const userId = req.user.userId;

    const [questionRows, configuredRows] = await Promise.all([
      connection.query(
        `SELECT question_id, question_text
         FROM security_questions
         WHERE is_active = 1
         ORDER BY display_order ASC, question_id ASC`
      ),
      connection.query(
        `SELECT usq.question_id, sq.question_text
         FROM user_security_questions usq
         JOIN security_questions sq ON sq.question_id = usq.question_id
         WHERE usq.user_id = ?
         ORDER BY usq.user_security_question_id ASC`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      hasSecurityQuestions: configuredRows[0].length > 0,
      availableQuestions: questionRows[0],
      configuredQuestions: configuredRows[0],
    });
  } catch (error) {
    console.error('Get security questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security questions'
    });
  } finally {
    connection.release();
  }
};

const upsertSecurityQuestions = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureSecuritySchema(connection);

    const userId = req.user.userId;
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];

    if (questions.length < 1 || questions.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'Set one or two security questions'
      });
    }

    const normalizedQuestions = questions.map((item) => ({
      questionId: Number(item?.questionId),
      answer: normalizeSecurityAnswer(item?.answer),
    }));

    const questionIds = normalizedQuestions.map((item) => item.questionId);
    const uniqueQuestionIds = new Set(questionIds);

    if (uniqueQuestionIds.size !== questionIds.length || normalizedQuestions.some((item) => !Number.isFinite(item.questionId) || !item.answer)) {
      return res.status(400).json({
        success: false,
        message: 'Choose valid security questions and answers'
      });
    }

    const [validQuestions] = await connection.query(
      `SELECT question_id
       FROM security_questions
       WHERE is_active = 1
         AND question_id IN (?)`,
      [questionIds]
    );

    if (validQuestions.length !== questionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected questions are invalid'
      });
    }

    await connection.beginTransaction();

    await connection.query('DELETE FROM user_security_questions WHERE user_id = ?', [userId]);

    for (const item of normalizedQuestions) {
      const answerHash = await bcrypt.hash(item.answer, 12);
      await connection.query(
        `INSERT INTO user_security_questions (user_id, question_id, answer_hash)
         VALUES (?, ?, ?)`,
        [userId, item.questionId, answerHash]
      );
    }

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, new_data)
       VALUES (?, 'security_questions_updated', 'user_security_questions', ?, ?)`,
      [userId, userId, JSON.stringify({ totalQuestions: normalizedQuestions.length })]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Security questions updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Upsert security questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating security questions'
    });
  } finally {
    connection.release();
  }
};

const getSecurityAuditLogs = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.userId;
    const [rows] = await connection.query(
      `SELECT log_id, action, table_name, record_id, old_data, new_data, ip_address, created_at
       FROM audit_log
       WHERE actor_id = ?
          OR (table_name = 'users' AND record_id = ?)
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId, userId]
    );

    res.json({
      success: true,
      audit: rows,
    });
  } catch (error) {
    console.error('Get security audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit data'
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyEmailCode,
  resendVerificationCode,
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  getSecurityQuestions,
  upsertSecurityQuestions,
  getSecurityAuditLogs,
  uploadAvatar,
  avatarUpload,
};