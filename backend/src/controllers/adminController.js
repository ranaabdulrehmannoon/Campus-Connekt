const pool = require('../config/database');
const { notifyUsers } = require('../utils/notificationService');
const { updateUserInMongoDB } = require('../sync/userSync');

const ALLOWED_ASSIGNABLE_ROLES = ['student', 'society_admin'];
const ALLOWED_NOTIFICATION_TYPES = ['general', 'admin_alert'];
let issuesSchemaEnsured = false;
let userApprovalSchemaEnsured = false;

const getRequesterIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || null;
};

const toSafeInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parsePagination = (query) => {
  const page = Math.max(toSafeInt(query.page, 1), 1);
  const limit = Math.min(Math.max(toSafeInt(query.limit, 20), 1), 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const ensureIssuesSchema = async (connection) => {
  if (issuesSchemaEnsured) return;

  await connection.query(
    `CREATE TABLE IF NOT EXISTS reported_issues (
       issue_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       title         VARCHAR(200) NOT NULL,
       description   TEXT NOT NULL,
       reported_by   INT UNSIGNED NULL,
       status        ENUM('open', 'in_progress', 'resolved') NOT NULL DEFAULT 'open',
       severity      ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
       resolved_by   INT UNSIGNED NULL,
       resolved_at   DATETIME NULL,
       created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY fk_issue_reporter (reported_by) REFERENCES users(user_id) ON DELETE SET NULL,
       FOREIGN KEY fk_issue_resolver (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL,
       INDEX idx_issue_status (status),
       INDEX idx_issue_severity (severity),
       INDEX idx_issue_created (created_at)
     )`
  );

  issuesSchemaEnsured = true;
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

const getUsers = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureUserApprovalSchema(connection);

    const { role = 'all', status = 'all', search = '', approvalStatus = 'all' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const conditions = ['1 = 1'];
    const params = [];

    if (role !== 'all') {
      conditions.push('role = ?');
      params.push(role);
    }

    if (status === 'active') {
      conditions.push('is_active = 1');
    } else if (status === 'inactive') {
      conditions.push('is_active = 0');
    }

    if (approvalStatus !== 'all') {
      conditions.push('approval_status = ?');
      params.push(approvalStatus);
    }

    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      conditions.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
      params.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`);
    }

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    const [users] = await connection.query(
      `SELECT user_id, email, role, first_name, last_name, department, batch_year,
              is_active, is_verified, requested_role, approval_status, approved_by,
              approved_at, approval_requested_at, last_login, created_at
       FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [roleBreakdown] = await connection.query(
      `SELECT role, COUNT(*) AS total
       FROM users
       GROUP BY role
       ORDER BY total DESC`
    );

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: Number(countRows[0]?.total || 0),
      },
      roleBreakdown,
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  } finally {
    connection.release();
  }
};

const updateUserStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureUserApprovalSchema(connection);

    const targetUserId = Number(req.params.id);
    const isActive = req.body?.isActive;

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be true or false' });
    }

    if (req.user.userId === targetUserId && isActive === false) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    const [currentRows] = await connection.query(
      `SELECT user_id, email, role, is_active
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = currentRows[0];

    if (currentUser.role === 'admin' && isActive === false) {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deactivated' });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE users
       SET is_active = ?
       WHERE user_id = ?`,
      [isActive ? 1 : 0, targetUserId]
    );

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES (?, 'user_status_changed', 'users', ?, ?, ?, ?)`,
      [
        req.user.userId,
        targetUserId,
        JSON.stringify({ is_active: currentUser.is_active }),
        JSON.stringify({ is_active: isActive ? 1 : 0 }),
        getRequesterIp(req),
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
    });
  } finally {
    connection.release();
  }
};

const updateUserRole = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureUserApprovalSchema(connection);

    const targetUserId = Number(req.params.id);
    const nextRole = String(req.body?.role || '').trim();

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (!ALLOWED_ASSIGNABLE_ROLES.includes(nextRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role value' });
    }

    if (req.user.userId === targetUserId) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    const [currentRows] = await connection.query(
      `SELECT user_id, email, role
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = currentRows[0];

    if (currentUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin role cannot be changed' });
    }

    if (currentUser.role === nextRole) {
      return res.json({ success: true, message: 'Role is already set to this value' });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE users
       SET role = ?
       WHERE user_id = ?`,
      [nextRole, targetUserId]
    );

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES (?, 'role_changed', 'users', ?, ?, ?, ?)`,
      [
        req.user.userId,
        targetUserId,
        JSON.stringify({ role: currentUser.role }),
        JSON.stringify({ role: nextRole }),
        getRequesterIp(req),
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Role updated to ${nextRole}`,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
    });
  } finally {
    connection.release();
  }
};

const decideUserApproval = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureUserApprovalSchema(connection);

    const targetUserId = Number(req.params.id);
    const decision = String(req.body?.decision || '').trim().toLowerCase();

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approve or reject' });
    }

    const [currentRows] = await connection.query(
      `SELECT user_id, email, role, requested_role, approval_status, is_active
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = currentRows[0];

    if (currentUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin account approval state cannot be changed' });
    }

    if (currentUser.requested_role !== 'society_admin') {
      return res.status(400).json({ success: false, message: 'This account does not require organizer approval' });
    }

    const nextApprovalStatus = decision === 'approve' ? 'approved' : 'rejected';
    const nextIsActive = decision === 'approve' ? 1 : 0;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE users
       SET approval_status = ?,
           is_active = ?,
           approved_by = ?,
           approved_at = NOW()
       WHERE user_id = ?`,
      [nextApprovalStatus, nextIsActive, req.user.userId, targetUserId]
    );

    // Sync to MongoDB
    await updateUserInMongoDB(targetUserId, {
      approval_status: nextApprovalStatus,
      is_active: nextIsActive === 1,
      approved_by: req.user.userId,
      approved_at: new Date(),
    });

    await notifyUsers(connection, [targetUserId], {
      title: decision === 'approve' ? 'Organizer Account Approved' : 'Organizer Account Rejected',
      message: decision === 'approve'
        ? 'Your organizer/society admin request was approved. You can now sign in.'
        : 'Your organizer/society admin request was rejected. Contact support for details.',
      type: 'admin_alert',
      referenceId: targetUserId,
      referenceType: 'user',
    });

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES (?, 'user_approval_decision', 'users', ?, ?, ?, ?)`,
      [
        req.user.userId,
        targetUserId,
        JSON.stringify({ approval_status: currentUser.approval_status, is_active: currentUser.is_active }),
        JSON.stringify({ approval_status: nextApprovalStatus, is_active: nextIsActive }),
        getRequesterIp(req),
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: decision === 'approve' ? 'Account approved successfully' : 'Account rejected successfully',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Decide user approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating account approval status',
    });
  } finally {
    connection.release();
  }
};

const deleteUserAccount = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const targetUserId = Number(req.params.id);

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (req.user.userId === targetUserId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const [currentRows] = await connection.query(
      `SELECT user_id, email, role, is_active
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = currentRows[0];

    if (currentUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted' });
    }

    await connection.beginTransaction();

    // Reassign ownership of entities that have RESTRICT foreign keys to the acting admin
    const actingAdminId = req.user.userId;

    await Promise.all([
      // Societies.created_by is NOT NULL with ON DELETE RESTRICT
      connection.query(`UPDATE societies SET created_by = ? WHERE created_by = ?`, [actingAdminId, targetUserId]),
      // Events.created_by is NOT NULL with ON DELETE RESTRICT
      connection.query(`UPDATE events SET created_by = ? WHERE created_by = ?`, [actingAdminId, targetUserId]),
      // Resources.uploaded_by is NOT NULL with ON DELETE RESTRICT
      connection.query(`UPDATE resources SET uploaded_by = ? WHERE uploaded_by = ?`, [actingAdminId, targetUserId]),
      // Announcements.created_by is NOT NULL with ON DELETE RESTRICT
      connection.query(`UPDATE announcements SET created_by = ? WHERE created_by = ?`, [actingAdminId, targetUserId]),
    ]);

    await connection.query(
      `DELETE FROM users
       WHERE user_id = ?`,
      [targetUserId]
    );

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, ip_address)
       VALUES (?, 'user_deleted', 'users', ?, ?, ?)`,
      [
        req.user.userId,
        targetUserId,
        JSON.stringify({ email: currentUser.email, role: currentUser.role, is_active: currentUser.is_active }),
        getRequesterIp(req),
      ]
    );

    await connection.commit();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete user account error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user account' });
  } finally {
    connection.release();
  }
};

const getUserActivity = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const targetUserId = Number(req.params.id);
    const limit = Math.min(Math.max(toSafeInt(req.query.limit, 50), 1), 200);

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const [userRows] = await connection.query(
      `SELECT user_id, email, first_name, last_name, role, is_active, last_login
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [activityRows] = await connection.query(
      `SELECT *
       FROM (
         SELECT
           'event_registration' AS activity_type,
           CONCAT('Registered for event: ', e.title) AS description,
           er.status AS detail,
           er.registered_at AS created_at,
           er.registration_id AS reference_id,
           'event_registration' AS reference_type
         FROM event_registrations er
         JOIN events e ON e.event_id = er.event_id
         WHERE er.user_id = ?

         UNION ALL

         SELECT
           'resource_upload' AS activity_type,
           CONCAT('Uploaded resource: ', r.title) AS description,
           r.status AS detail,
           r.created_at AS created_at,
           r.resource_id AS reference_id,
           'resource' AS reference_type
         FROM resources r
         WHERE r.uploaded_by = ?

         UNION ALL

         SELECT
           'society_membership' AS activity_type,
           CONCAT('Joined society: ', s.name) AS description,
           sm.role AS detail,
           sm.joined_at AS created_at,
           sm.society_id AS reference_id,
           'society' AS reference_type
         FROM society_members sm
         JOIN societies s ON s.society_id = sm.society_id
         WHERE sm.user_id = ?

         UNION ALL

         SELECT
           'audit_log' AS activity_type,
           action AS description,
           table_name AS detail,
           created_at,
           log_id AS reference_id,
           'audit_log' AS reference_type
         FROM audit_log
         WHERE actor_id = ?
            OR (table_name = 'users' AND record_id = ?)
       ) AS activity_feed
       ORDER BY created_at DESC
       LIMIT ?`,
      [targetUserId, targetUserId, targetUserId, targetUserId, targetUserId, limit]
    );

    res.json({
      success: true,
      user: userRows[0],
      activity: activityRows,
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
    });
  } finally {
    connection.release();
  }
};

const getAuditLogs = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { actorId = '', action = '', tableName = '', recordId = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const conditions = ['1 = 1'];
    const params = [];

    if (String(actorId).trim()) {
      conditions.push('al.actor_id = ?');
      params.push(Number(actorId));
    }

    if (String(recordId).trim()) {
      conditions.push('al.record_id = ?');
      params.push(Number(recordId));
    }

    if (String(action).trim()) {
      conditions.push('al.action LIKE ?');
      params.push(`%${String(action).trim()}%`);
    }

    if (String(tableName).trim()) {
      conditions.push('al.table_name = ?');
      params.push(String(tableName).trim());
    }

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM audit_log al
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    const [logs] = await connection.query(
      `SELECT al.log_id, al.actor_id, al.action, al.table_name, al.record_id,
              al.old_data, al.new_data, al.ip_address, al.created_at,
              u.email AS actor_email,
              CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS actor_name
       FROM audit_log al
       LEFT JOIN users u ON u.user_id = al.actor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const normalizedLogs = logs.map((item) => ({
      ...item,
      old_data: parseMaybeJson(item.old_data),
      new_data: parseMaybeJson(item.new_data),
      actor_name: String(item.actor_name || '').trim(),
    }));

    res.json({
      success: true,
      audit: normalizedLogs,
      pagination: {
        page,
        limit,
        total: Number(countRows[0]?.total || 0),
      },
    });
  } catch (error) {
    console.error('Get admin audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
    });
  } finally {
    connection.release();
  }
};

const sendGlobalNotification = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    const requestedType = String(req.body?.type || 'general').trim();
    const type = ALLOWED_NOTIFICATION_TYPES.includes(requestedType) ? requestedType : 'general';

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    const [userRows] = await connection.query(
      `SELECT user_id
       FROM users
       WHERE is_active = 1`
    );

    const recipientIds = userRows.map((row) => row.user_id);

    await connection.beginTransaction();

    await notifyUsers(connection, recipientIds, {
      title,
      message,
      type,
      referenceType: 'global_broadcast',
    });

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, new_data, ip_address)
       VALUES (?, 'global_notification_sent', 'notifications', 0, ?, ?)`,
      [
        req.user.userId,
        JSON.stringify({
          title,
          type,
          recipients: recipientIds.length,
        }),
        getRequesterIp(req),
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Global notification sent successfully',
      recipientCount: recipientIds.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Send global notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending global notification',
    });
  } finally {
    connection.release();
  }
};

const getReportedIssues = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureIssuesSchema(connection);

    const { status = 'all' } = req.query;
    const limit = Math.min(Math.max(toSafeInt(req.query.limit, 100), 1), 200);

    const conditions = ['1 = 1'];
    const params = [];

    if (status !== 'all') {
      conditions.push('ri.status = ?');
      params.push(status);
    }

    const [issues] = await connection.query(
      `SELECT ri.issue_id, ri.title, ri.description, ri.status, ri.severity, ri.created_at,
              ri.updated_at, ri.resolved_at, ri.reported_by,
              CONCAT(COALESCE(reporter.first_name, ''), ' ', COALESCE(reporter.last_name, '')) AS reporter_name,
              reporter.email AS reporter_email,
              ri.resolved_by,
              CONCAT(COALESCE(resolver.first_name, ''), ' ', COALESCE(resolver.last_name, '')) AS resolved_by_name
       FROM reported_issues ri
       LEFT JOIN users reporter ON reporter.user_id = ri.reported_by
       LEFT JOIN users resolver ON resolver.user_id = ri.resolved_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE ri.status
           WHEN 'open' THEN 0
           WHEN 'in_progress' THEN 1
           ELSE 2
         END,
         ri.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({ success: true, issues });
  } catch (error) {
    console.error('Get reported issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reported issues',
    });
  } finally {
    connection.release();
  }
};

const resolveReportedIssue = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureIssuesSchema(connection);

    const issueId = Number(req.params.id);
    const status = String(req.body?.status || 'resolved');

    if (!Number.isFinite(issueId)) {
      return res.status(400).json({ success: false, message: 'Invalid issue id' });
    }

    if (!['in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const [currentRows] = await connection.query(
      `SELECT issue_id, status
       FROM reported_issues
       WHERE issue_id = ?
       LIMIT 1`,
      [issueId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE reported_issues
       SET status = ?,
           resolved_by = ?,
           resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE NULL END
       WHERE issue_id = ?`,
      [status, req.user.userId, status, issueId]
    );

    await connection.query(
      `INSERT INTO audit_log (actor_id, action, table_name, record_id, old_data, new_data, ip_address)
       VALUES (?, 'issue_status_changed', 'reported_issues', ?, ?, ?, ?)`,
      [
        req.user.userId,
        issueId,
        JSON.stringify({ status: currentRows[0].status }),
        JSON.stringify({ status }),
        getRequesterIp(req),
      ]
    );

    await connection.commit();

    res.json({ success: true, message: 'Issue status updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Resolve reported issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating issue status',
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  decideUserApproval,
  deleteUserAccount,
  getUserActivity,
  getAuditLogs,
  sendGlobalNotification,
  getReportedIssues,
  resolveReportedIssue,
};
