const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/database');
const { notifyAdmins, notifyUsers, insertNotification } = require('../utils/notificationService');
const { syncSocietyToMongoDB, updateSocietyInMongoDB } = require('../sync/societySync');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const societyUploadsDir = path.join(uploadsRoot, 'societies');

if (!fs.existsSync(societyUploadsDir)) {
  fs.mkdirSync(societyUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, societyUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '';
    cb(null, `society-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({ storage });

const normalizeSociety = (row) => ({
  ...row,
  logo_url: row.logo ? (row.logo.startsWith('http') ? row.logo : `/uploads/${row.logo}`) : null,
});

const ALLOWED_MEMBER_ROLES = new Set(['member', 'moderator', 'president', 'vice_president', 'secretary', 'treasurer']);
const ALLOWED_SOCIETY_CATEGORIES = new Set(['technical', 'cultural', 'sports', 'literary', 'social', 'religious', 'other']);

const canManageSociety = (society, user) => {
  if (!society || !user) return false;
  return user.role === 'admin' || society.created_by === user.userId;
};

const canManageSocietyContent = async (connection, societyId, user) => {
  // Admin or creator can manage
  if (!user) return false;
  if (user.role === 'admin') return true;

  const [societyRows] = await connection.query(
    `SELECT created_by FROM societies WHERE society_id = ?`,
    [societyId]
  );

  if (societyRows.length === 0) return false;
  if (societyRows[0].created_by === user.userId) return true;

  // Check if user is president or moderator in this society
  const [memberRows] = await connection.query(
    `SELECT role FROM society_members WHERE society_id = ? AND user_id = ? AND is_active = 1 AND role IN ('president', 'moderator')`,
    [societyId, user.userId]
  );

  return memberRows.length > 0;
};

const notifySocietyMembersForAnnouncement = async (connection, societyId, payload, excludeUserId = null) => {
  const [memberRows] = await connection.query(
    `SELECT user_id
     FROM society_members
     WHERE society_id = ?
       AND is_active = 1`,
    [societyId]
  );

  const targetUserIds = memberRows
    .map((row) => row.user_id)
    .filter((userId) => Number(userId) !== Number(excludeUserId));

  await notifyUsers(connection, targetUserIds, payload);
};

const getSocieties = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { search, category } = req.query;

    const params = [];
    const conditions = [];

    if (req.user) {
      conditions.push('(s.is_approved = 1 OR s.created_by = ?)');
      params.push(req.user.userId);
    } else {
      conditions.push('s.is_approved = 1');
    }

    if (search) {
      conditions.push('(s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ?)');
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard);
    }

    if (category && category !== 'all') {
      conditions.push('s.category = ?');
      params.push(category);
    }

        let query = `
      SELECT s.society_id, s.name, s.description, s.logo, s.category, s.is_approved,
             s.created_by, s.created_at,
             CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
             COUNT(sm.membership_id) AS member_count
      FROM societies s
      JOIN users u ON u.user_id = s.created_by
      LEFT JOIN society_members sm ON sm.society_id = s.society_id AND sm.is_active = 1
      WHERE ${conditions.join(' AND ')}
    `;

    query += ' GROUP BY s.society_id ORDER BY member_count DESC, s.name ASC';

    const [societies] = await connection.query(query, params);

    if (req.user && societies.length > 0) {
      const ids = societies.map((society) => society.society_id);
      const [memberships] = await connection.query(
        `SELECT society_id, role
         FROM society_members
         WHERE user_id = ? AND is_active = 1 AND society_id IN (?)`,
        [req.user.userId, ids]
      );

      const membershipMap = new Map();
      memberships.forEach((membership) => {
        membershipMap.set(membership.society_id, membership.role);
      });

      societies.forEach((society) => {
        const role = membershipMap.get(society.society_id) || null;
        society.is_joined = Boolean(role);
        society.member_role = role;
      });
    }

    res.json({
      success: true,
      societies: societies.map(normalizeSociety),
    });
  } catch (error) {
    console.error('Get societies error:', error);
    res.status(500).json({ success: false, message: 'Error fetching societies' });
  } finally {
    connection.release();
  }
};

const getSocietyById = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [societyRows] = await connection.query(
      `SELECT s.society_id, s.name, s.description, s.logo, s.category, s.is_approved,
              s.created_by, s.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
              COUNT(sm.membership_id) AS member_count
       FROM societies s
       JOIN users u ON u.user_id = s.created_by
       LEFT JOIN society_members sm ON sm.society_id = s.society_id AND sm.is_active = 1
       WHERE s.society_id = ?
       GROUP BY s.society_id`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const society = societyRows[0];

    if (!society.is_approved && !canManageSociety(society, req.user || {})) {
      return res.status(403).json({ success: false, message: 'Society is pending approval' });
    }

    const [announcements] = await connection.query(
      `SELECT a.announcement_id, a.title, a.content, a.is_pinned, a.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS posted_by_name
       FROM announcements a
       JOIN users u ON u.user_id = a.created_by
       WHERE a.society_id = ?
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 20`,
      [id]
    );

    const [events] = await connection.query(
      `SELECT e.event_id, e.title, e.description, e.start_datetime, e.end_datetime,
              e.category, e.status, e.capacity, e.registered_count,
              CASE WHEN e.capacity IS NULL THEN NULL
                   ELSE e.capacity - e.registered_count END AS spots_left
       FROM events e
       WHERE e.society_id = ? AND e.is_approved = 1
       ORDER BY e.start_datetime ASC
       LIMIT 12`,
      [id]
    );

    const [members] = await connection.query(
      `SELECT sm.membership_id, sm.user_id, sm.role, sm.joined_at,
              u.first_name, u.last_name, u.email
       FROM society_members sm
       JOIN users u ON u.user_id = sm.user_id
       WHERE sm.society_id = ? AND sm.is_active = 1
       ORDER BY FIELD(sm.role, 'president', 'vice_president', 'secretary', 'treasurer', 'moderator', 'member'),
                sm.joined_at ASC`,
      [id]
    );

    let currentMembership = null;
    let membershipHistory = null;
    let isCreator = false;
    let canManageContent = false;

    if (req.user) {
      isCreator = society.created_by === req.user.userId || req.user.role === 'admin';
      canManageContent = await canManageSocietyContent(connection, id, req.user);

      const [membershipRows] = await connection.query(
        `SELECT role
         FROM society_members
         WHERE society_id = ? AND user_id = ? AND is_active = 1
         LIMIT 1`,
        [id, req.user.userId]
      );
      currentMembership = membershipRows[0]?.role || null;

      const [historyRows] = await connection.query(
        `SELECT role, is_active
         FROM society_members
         WHERE society_id = ? AND user_id = ?
         ORDER BY joined_at DESC
         LIMIT 1`,
        [id, req.user.userId]
      );
      membershipHistory = historyRows[0] || null;
    }

    res.json({
      success: true,
      society: {
        ...normalizeSociety(society),
        is_joined: Boolean(currentMembership),
        member_role: currentMembership,
        had_membership: Boolean(membershipHistory),
        membership_history_role: membershipHistory?.role || null,
        is_creator: isCreator,
        can_manage_content: canManageContent,
      },
      announcements,
      events,
      members,
    });
  } catch (error) {
    console.error('Get society by id error:', error);
    res.status(500).json({ success: false, message: 'Error fetching society details' });
  } finally {
    connection.release();
  }
};

const createSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { name, description, category } = req.body;
    const logo = req.file ? `societies/${req.file.filename}` : (req.body.logo || null);
    const isAdminCreation = req.user.role === 'admin';
    const normalizedName = String(name || '').trim();

    if (!normalizedName) {
      return res.status(400).json({ success: false, message: 'Society name is required' });
    }

    if (category && !ALLOWED_SOCIETY_CATEGORIES.has(category)) {
      return res.status(400).json({ success: false, message: 'Invalid society category' });
    }

    const [existingNameRows] = await connection.query(
      `SELECT society_id
       FROM societies
       WHERE LOWER(name) = LOWER(?)
       LIMIT 1`,
      [normalizedName]
    );

    if (existingNameRows.length > 0) {
      return res.status(409).json({ success: false, message: 'A society with this name already exists' });
    }

    const [result] = await connection.query(
      `INSERT INTO societies (name, description, logo, category, created_by, is_approved)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [normalizedName, description || null, logo, category || 'other', req.user.userId]
    );

    // Sync to MongoDB
    const societyData = {
      society_id: result.insertId,
      name: normalizedName,
      description: description || null,
      logo,
      category: category || 'other',
      created_by: req.user.userId,
      is_approved: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await syncSocietyToMongoDB(societyData);

    if (isAdminCreation) {
      await connection.query(
        `UPDATE societies
         SET is_approved = 1,
             approved_by = ?,
             approved_at = NOW()
         WHERE society_id = ?`,
        [req.user.userId, result.insertId]
      );
    } else {
      await notifyAdmins(connection, {
        title: 'Society Approval Needed',
        message: `A new society called "${normalizedName}" is waiting for your review.`,
        type: 'admin_alert',
        referenceId: result.insertId,
        referenceType: 'society',
      });
    }

    await connection.query(
      `INSERT INTO society_members (society_id, user_id, role, is_active)
       VALUES (?, ?, 'president', 1)
       ON DUPLICATE KEY UPDATE role = 'president', is_active = 1`,
      [result.insertId, req.user.userId]
    );

    res.status(201).json({
      success: true,
      message: isAdminCreation
        ? 'Society created successfully and published'
        : 'Society created and submitted for admin approval',
      societyId: result.insertId,
    });
  } catch (error) {
    console.error('Create society error:', error);
    res.status(500).json({ success: false, message: 'Error creating society' });
  } finally {
    connection.release();
  }
};

const updateSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { name, description, category } = req.body;
    const logo = req.file ? `societies/${req.file.filename}` : (req.body.logo !== undefined ? req.body.logo : undefined);

    const [societyRows] = await connection.query(
      `SELECT society_id, created_by, logo
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    if (!canManageSociety(societyRows[0], req.user)) {
      return res.status(403).json({ success: false, message: 'You can only edit societies you created' });
    }

    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      return res.status(400).json({ success: false, message: 'Society name is required' });
    }

    if (category && !ALLOWED_SOCIETY_CATEGORIES.has(category)) {
      return res.status(400).json({ success: false, message: 'Invalid society category' });
    }

    const [duplicateRows] = await connection.query(
      `SELECT society_id
       FROM societies
       WHERE LOWER(name) = LOWER(?)
          AND society_id <> ?
       LIMIT 1`,
      [normalizedName, id]
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({ success: false, message: 'A society with this name already exists' });
    }

    const updateLogo = logo !== undefined ? logo : societyRows[0].logo;

    await connection.query(
      `UPDATE societies
       SET name = ?,
           description = ?,
           category = ?,
           logo = ?
       WHERE society_id = ?`,
      [normalizedName, description || null, category || 'other', updateLogo, id]
    );

    // Sync to MongoDB
    await updateSocietyInMongoDB(id, {
      name: normalizedName,
      description: description || null,
      category: category || 'other',
      logo: updateLogo,
    });

    res.json({ success: true, message: 'Society details updated successfully' });
  } catch (error) {
    console.error('Update society error:', error);
    res.status(500).json({ success: false, message: 'Error updating society' });
  } finally {
    connection.release();
  }
};

const joinSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [societyRows] = await connection.query(
      `SELECT society_id, name, created_by
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    await connection.query('CALL sp_join_society(?, ?, @p_message)', [req.user.userId, id]);
    const [messageResult] = await connection.query('SELECT @p_message AS message');

    if (societyRows[0].created_by !== req.user.userId) {
      const [memberRows] = await connection.query(
        `SELECT CONCAT(first_name, ' ', last_name) AS member_name
         FROM users
         WHERE user_id = ?`,
        [req.user.userId]
      );

      await insertNotification(connection, {
        userId: societyRows[0].created_by,
        title: 'New Society Member',
        message: `${memberRows[0]?.member_name || 'A user'} joined "${societyRows[0].name}".`,
        type: 'general',
        referenceId: Number(id),
        referenceType: 'society_membership',
      });
    }

    res.json({
      success: true,
      message: messageResult[0]?.message || 'Joined society successfully.',
    });
  } catch (error) {
    console.error('Join society error:', error);
    res.status(500).json({ success: false, message: 'Error joining society' });
  } finally {
    connection.release();
  }
};

const leaveSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [existingRows] = await connection.query(
      `SELECT membership_id, role
       FROM society_members
       WHERE society_id = ? AND user_id = ? AND is_active = 1`,
      [id, req.user.userId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'You are not an active member of this society' });
    }

    if (existingRows[0].role === 'president') {
      return res.status(400).json({ success: false, message: 'President cannot leave society without transferring leadership' });
    }

    await connection.query(
      `UPDATE society_members
       SET is_active = 0
       WHERE membership_id = ?`,
      [existingRows[0].membership_id]
    );

    res.json({ success: true, message: 'Left society successfully' });
  } catch (error) {
    console.error('Leave society error:', error);
    res.status(500).json({ success: false, message: 'Error leaving society' });
  } finally {
    connection.release();
  }
};

const getSocietyDashboard = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [societyRows] = await connection.query(
      `SELECT society_id, name, description, category, logo, created_by, is_approved, created_at
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const society = societyRows[0];

    // Check if user is the creator or admin
    const isCreatorOrAdmin = req.user.role === 'admin' || society.created_by === req.user.userId;
    
    // If not creator/admin, check if they are a member with appropriate role
    if (!isCreatorOrAdmin) {
      const [membershipRows] = await connection.query(
        `SELECT role FROM society_members 
         WHERE society_id = ? AND user_id = ? AND is_active = 1 
         AND role IN ('president', 'vice_president', 'secretary', 'treasurer', 'moderator')`,
        [id, req.user.userId]
      );
      
      if (membershipRows.length === 0) {
        return res.status(403).json({ success: false, message: 'You must be a member of this society with appropriate role to access the dashboard' });
      }
    }

    const [membersRows, announcementsRows, eventsRows, statsRows] = await Promise.all([
      connection.query(
        `SELECT sm.membership_id, sm.user_id, sm.role, sm.joined_at,
                u.first_name, u.last_name, u.email
         FROM society_members sm
         JOIN users u ON u.user_id = sm.user_id
         WHERE sm.society_id = ? AND sm.is_active = 1
         ORDER BY FIELD(sm.role, 'president', 'vice_president', 'secretary', 'treasurer', 'moderator', 'member'),
                  sm.joined_at ASC`,
        [id]
      ),
      connection.query(
        `SELECT a.announcement_id, a.title, a.content, a.is_pinned, a.created_at,
                CONCAT(u.first_name, ' ', u.last_name) AS posted_by_name
         FROM announcements a
         JOIN users u ON u.user_id = a.created_by
         WHERE a.society_id = ?
         ORDER BY a.is_pinned DESC, a.created_at DESC
         LIMIT 20`,
        [id]
      ),
      connection.query(
        `SELECT e.event_id, e.title, e.status, e.start_datetime, e.registered_count
         FROM events e
         WHERE e.society_id = ?
         ORDER BY e.created_at DESC
         LIMIT 10`,
        [id]
      ),
      connection.query(
        `SELECT
           (SELECT COUNT(*) FROM society_members WHERE society_id = ? AND is_active = 1) AS total_members,
           (SELECT COUNT(*) FROM announcements WHERE society_id = ?) AS total_announcements,
           (SELECT COUNT(*) FROM events WHERE society_id = ?) AS total_events,
           (SELECT COUNT(*) FROM events WHERE society_id = ? AND status = 'open') AS open_events`,
        [id, id, id, id]
      ),
    ]);

    res.json({
      success: true,
      society: normalizeSociety(society),
      members: membersRows[0],
      announcements: announcementsRows[0],
      events: eventsRows[0],
      stats: statsRows[0][0],
    });
  } catch (error) {
    console.error('Get society dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error fetching society dashboard' });
  } finally {
    connection.release();
  }
};

const createAnnouncement = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { title, content, isPinned = false } = req.body;
    const trimmedTitle = String(title || '').trim();
    const trimmedContent = String(content || '').trim();

    if (!trimmedTitle || !trimmedContent) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const [societyRows] = await connection.query(
      `SELECT society_id, name, created_by
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const canManage = await canManageSocietyContent(connection, id, req.user);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to post announcements in this society' });
    }

    const [result] = await connection.query(
      `INSERT INTO announcements (society_id, created_by, title, content, is_pinned)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.userId, trimmedTitle, trimmedContent, isPinned ? 1 : 0]
    );

    await notifySocietyMembersForAnnouncement(
      connection,
      id,
      {
        title: `${societyRows[0].name} announcement`,
        message: trimmedTitle,
        type: 'announcement',
        referenceId: result.insertId,
        referenceType: 'announcement',
      },
      req.user.userId,
    );

    res.status(201).json({ success: true, message: 'Announcement posted successfully', announcementId: result.insertId });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Error posting announcement' });
  } finally {
    connection.release();
  }
};

const updateAnnouncement = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id, announcementId } = req.params;
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const isPinned = req.body?.isPinned === true || req.body?.isPinned === 1;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const [societyRows] = await connection.query(
      `SELECT society_id, name, created_by
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const canManage = await canManageSocietyContent(connection, id, req.user);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to edit announcements in this society' });
    }

    const [announcementRows] = await connection.query(
      `SELECT announcement_id
       FROM announcements
       WHERE announcement_id = ? AND society_id = ?
       LIMIT 1`,
      [announcementId, id]
    );

    if (announcementRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await connection.query(
      `UPDATE announcements
       SET title = ?,
           content = ?,
           is_pinned = ?
       WHERE announcement_id = ?`,
      [title, content, isPinned ? 1 : 0, announcementId]
    );

    await notifySocietyMembersForAnnouncement(
      connection,
      id,
      {
        title: `${societyRows[0].name} announcement updated`,
        message: title,
        type: 'announcement',
        referenceId: Number(announcementId),
        referenceType: 'announcement',
      },
      req.user.userId,
    );

    res.json({ success: true, message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ success: false, message: 'Error updating announcement' });
  } finally {
    connection.release();
  }
};

const deleteAnnouncement = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id, announcementId } = req.params;

    const [societyRows] = await connection.query(
      `SELECT society_id, created_by
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    const canManage = await canManageSocietyContent(connection, id, req.user);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'You don\'t have permission to delete announcements in this society' });
    }

    const [result] = await connection.query(
      `DELETE FROM announcements
       WHERE announcement_id = ? AND society_id = ?`,
      [announcementId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, message: 'Error deleting announcement' });
  } finally {
    connection.release();
  }
};

const addMemberByEmail = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { email, role = 'member' } = req.body;
    const normalizedRole = String(role || 'member');

    if (!email) {
      return res.status(400).json({ success: false, message: 'Member email is required' });
    }

    if (!ALLOWED_MEMBER_ROLES.has(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid member role' });
    }

    const [societyRows] = await connection.query(
      `SELECT society_id, created_by, is_approved
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    if (!canManageSociety(societyRows[0], req.user)) {
      return res.status(403).json({ success: false, message: 'You can only manage members in your own society' });
    }

    const [users] = await connection.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No user found with this email' });
    }

    const memberUserId = users[0].user_id;

    const [existingMembershipRows] = await connection.query(
      `SELECT membership_id
       FROM society_members
       WHERE society_id = ? AND user_id = ? AND is_active = 1
       LIMIT 1`,
      [id, memberUserId]
    );

    if (existingMembershipRows.length > 0) {
      return res.status(409).json({ success: false, message: 'This user is already an active member of the society' });
    }

    await connection.query(
      `INSERT INTO society_members (society_id, user_id, role, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         is_active = 1`,
      [id, memberUserId, normalizedRole]
    );

    res.json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, message: 'Error adding member' });
  } finally {
    connection.release();
  }
};

const updateMemberRole = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id, memberUserId } = req.params;
    const role = String(req.body?.role || '');

    if (!ALLOWED_MEMBER_ROLES.has(role)) {
      return res.status(400).json({ success: false, message: 'Invalid member role' });
    }

    const [societyRows] = await connection.query(
      `SELECT society_id, created_by
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    if (!canManageSociety(societyRows[0], req.user)) {
      return res.status(403).json({ success: false, message: 'You can only manage members in your own society' });
    }

    const [membershipRows] = await connection.query(
      `SELECT membership_id
       FROM society_members
       WHERE society_id = ? AND user_id = ? AND is_active = 1
       LIMIT 1`,
      [id, memberUserId]
    );

    if (membershipRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found in this society' });
    }

    await connection.query(
      `UPDATE society_members
       SET role = ?
       WHERE membership_id = ?`,
      [role, membershipRows[0].membership_id]
    );

    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ success: false, message: 'Error updating member role' });
  } finally {
    connection.release();
  }
};

const removeMember = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id, memberUserId } = req.params;

    const [societyRows] = await connection.query(
      `SELECT society_id, created_by
       FROM societies
       WHERE society_id = ?`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    if (!canManageSociety(societyRows[0], req.user)) {
      return res.status(403).json({ success: false, message: 'You can only manage members in your own society' });
    }

    const [membershipRows] = await connection.query(
      `SELECT membership_id, role
       FROM society_members
       WHERE society_id = ? AND user_id = ? AND is_active = 1`,
      [id, memberUserId]
    );

    if (membershipRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found in this society' });
    }

    if (membershipRows[0].role === 'president') {
      return res.status(400).json({ success: false, message: 'President cannot be removed from society' });
    }

    await connection.query(
      `UPDATE society_members
       SET is_active = 0
       WHERE membership_id = ?`,
      [membershipRows[0].membership_id]
    );

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Error removing member' });
  } finally {
    connection.release();
  }
};

const getPendingSocieties = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [societies] = await connection.query(
      `SELECT s.society_id, s.name, s.description, s.category, s.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
              u.email AS created_by_email
       FROM societies s
       JOIN users u ON u.user_id = s.created_by
       WHERE s.is_approved = 0
       ORDER BY s.created_at ASC`
    );

    res.json({ success: true, societies });
  } catch (error) {
    console.error('Get pending societies error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending societies' });
  } finally {
    connection.release();
  }
};

const approveSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [result] = await connection.query(
      `UPDATE societies
       SET is_approved = 1,
           approved_by = ?,
           approved_at = NOW()
       WHERE society_id = ? AND is_approved = 0`,
      [req.user.userId, id]
    );

    // Sync to MongoDB
    await updateSocietyInMongoDB(id, {
      is_approved: true,
      approved_by: req.user.userId,
      approved_at: new Date(),
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Society not found or already approved' });
    }

    const [societyRows] = await connection.query(
      `SELECT s.society_id, s.name, s.created_by
       FROM societies s
       WHERE s.society_id = ?`,
      [id]
    );

    if (societyRows.length > 0) {
      await insertNotification(connection, {
        userId: societyRows[0].created_by,
        title: 'Society Approved',
        message: `Your society "${societyRows[0].name}" has been approved and is now visible to students.`,
        type: 'general',
        referenceId: societyRows[0].society_id,
        referenceType: 'society',
      });
    }

    res.json({ success: true, message: 'Society approved successfully' });
  } catch (error) {
    console.error('Approve society error:', error);
    res.status(500).json({ success: false, message: 'Error approving society' });
  } finally {
    connection.release();
  }
};

const rejectSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [societyRows] = await connection.query(
      `SELECT s.society_id, s.name, s.created_by, s.is_approved
       FROM societies s
       WHERE s.society_id = ?
       LIMIT 1`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    if (Number(societyRows[0].is_approved) === 1) {
      return res.status(400).json({ success: false, message: 'Approved societies cannot be rejected from pending queue' });
    }

    const [result] = await connection.query(
      `UPDATE societies
       SET is_approved = -1,
           approved_by = ?,
           approved_at = NOW()
       WHERE society_id = ?
         AND is_approved = 0`,
      [req.user.userId, id]
    );

    // Sync to MongoDB (rejected societies are still stored but marked as not approved)
    await updateSocietyInMongoDB(id, {
      is_approved: false,
      approved_by: req.user.userId,
      approved_at: new Date(),
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Society not found in pending queue' });
    }

    if (societyRows[0].created_by !== req.user.userId) {
      await insertNotification(connection, {
        userId: societyRows[0].created_by,
        title: 'Society Rejected',
        message: `Your society "${societyRows[0].name}" was rejected during review.`,
        type: 'general',
        referenceId: societyRows[0].society_id,
        referenceType: 'society',
      });
    }

    res.json({ success: true, message: 'Society rejected successfully' });
  } catch (error) {
    console.error('Reject society error:', error);
    res.status(500).json({ success: false, message: 'Error rejecting society' });
  } finally {
    connection.release();
  }
};

const getAdminSocieties = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [societies] = await connection.query(
      `SELECT s.society_id, s.name, s.description, s.logo, s.category, s.is_approved,
              s.created_by, s.created_at, s.approved_at,
              CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
              COUNT(sm.membership_id) AS member_count
       FROM societies s
       JOIN users u ON u.user_id = s.created_by
       LEFT JOIN society_members sm ON sm.society_id = s.society_id AND sm.is_active = 1
       GROUP BY s.society_id
       ORDER BY s.created_at DESC`
    );

    res.json({
      success: true,
      societies: societies.map(normalizeSociety),
    });
  } catch (error) {
    console.error('Get admin societies error:', error);
    res.status(500).json({ success: false, message: 'Error fetching societies' });
  } finally {
    connection.release();
  }
};

const deleteSociety = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [societyRows] = await connection.query(
      `SELECT society_id, created_by
       FROM societies
       WHERE society_id = ?
       LIMIT 1`,
      [id]
    );

    if (societyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found' });
    }

    if (!canManageSociety(societyRows[0], req.user)) {
      return res.status(403).json({ success: false, message: 'Only the society creator or admin can delete this society' });
    }

    await connection.query(
      `DELETE FROM societies
       WHERE society_id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Society deleted successfully' });
  } catch (error) {
    console.error('Delete society error:', error);
    res.status(500).json({ success: false, message: 'Error deleting society' });
  } finally {
    connection.release();
  }
};

module.exports = {
  upload,
  getSocieties,
  getSocietyById,
  createSociety,
  updateSociety,
  joinSociety,
  leaveSociety,
  getSocietyDashboard,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  addMemberByEmail,
  updateMemberRole,
  removeMember,
  getPendingSocieties,
  approveSociety,
  rejectSociety,
  getAdminSocieties,
  deleteSociety,
};