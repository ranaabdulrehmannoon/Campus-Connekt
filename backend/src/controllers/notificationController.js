const pool = require('../config/database');
const { insertNotification } = require('../utils/notificationService');

const syncStudentReminders = async (connection, userId) => {
  const [reminders] = await connection.query(
    `SELECT e.event_id, e.title, e.start_datetime, e.location
     FROM event_registrations er
     JOIN events e ON e.event_id = er.event_id
     WHERE er.user_id = ?
       AND er.status = 'confirmed'
       AND e.start_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
       AND e.status IN ('open', 'closed')
     ORDER BY e.start_datetime ASC`,
    [userId]
  );

  for (const reminder of reminders) {
    await insertNotification(connection, {
      userId,
      title: 'Event Reminder',
      message: `You are registered for "${reminder.title}" on ${new Date(reminder.start_datetime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      type: 'event_reminder',
      referenceId: reminder.event_id,
      referenceType: 'event',
    });
  }
};

const syncOrganizerRegistrations = async (connection, userId) => {
  const [registrations] = await connection.query(
    `SELECT er.registration_id, er.registered_at, er.status,
            e.event_id, e.title AS event_title,
            CONCAT(u.first_name, ' ', u.last_name) AS attendee_name
     FROM event_registrations er
     JOIN events e ON e.event_id = er.event_id
     JOIN users u ON u.user_id = er.user_id
     WHERE e.created_by = ?
       AND er.registered_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND er.status IN ('confirmed', 'waitlisted')
     ORDER BY er.registered_at DESC`,
    [userId]
  );

  for (const registration of registrations) {
    await insertNotification(connection, {
      userId,
      title: registration.status === 'waitlisted' ? 'Event Waitlist Update' : 'New Event Registration',
      message: registration.status === 'waitlisted'
        ? `${registration.attendee_name} joined the waitlist for "${registration.event_title}".`
        : `${registration.attendee_name} registered for "${registration.event_title}".`,
      type: 'general',
      referenceId: registration.registration_id,
      referenceType: 'event_registration',
    });
  }
};

const syncAdminApprovals = async (connection, userId) => {
  const [pendingSocieties] = await connection.query(
    `SELECT society_id, name
     FROM societies
     WHERE is_approved = 0
     ORDER BY created_at DESC`
  );

  for (const society of pendingSocieties) {
    await insertNotification(connection, {
      userId,
      title: 'Society Approval Needed',
      message: `Society "${society.name}" is waiting for your review.`,
      type: 'admin_alert',
      referenceId: society.society_id,
      referenceType: 'society',
    });
  }

  const [pendingResources] = await connection.query(
    `SELECT resource_id, title
     FROM resources
     WHERE status = 'pending'
     ORDER BY created_at DESC`
  );

  for (const resource of pendingResources) {
    await insertNotification(connection, {
      userId,
      title: 'Resource Approval Needed',
      message: `Resource "${resource.title}" is waiting for moderation.`,
      type: 'admin_alert',
      referenceId: resource.resource_id,
      referenceType: 'resource',
    });
  }

  const [pendingOrganizerAccounts] = await connection.query(
    `SELECT user_id, first_name, last_name, email
     FROM users
     WHERE approval_status = 'pending'
       AND requested_role = 'society_admin'
     ORDER BY approval_requested_at DESC`
  );

  for (const account of pendingOrganizerAccounts) {
    const name = `${account.first_name || ''} ${account.last_name || ''}`.trim() || account.email;
    await insertNotification(connection, {
      userId,
      title: 'Organizer Account Approval Needed',
      message: `${name} requested organizer/society admin access.`,
      type: 'admin_alert',
      referenceId: account.user_id,
      referenceType: 'user',
    });
  }
};

const getNotificationCategory = (notification) => {
  if (notification.type === 'event_reminder') return 'event_reminder';
  if (notification.type === 'registration_confirm' || notification.reference_type === 'event_registration') return 'event_registration';
  if (notification.type === 'resource_approved' || notification.type === 'resource_rejected' || notification.reference_type === 'resource') return 'resource_approval';
  if (notification.type === 'announcement' || notification.reference_type === 'announcement') return 'society_announcement';
  if (notification.type === 'admin_alert') return 'approval';
  return 'general';
};

const getNotifications = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { limit = 50, unreadOnly = 'false', category = 'all' } = req.query;
    const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    if (req.user.role === 'student') {
      await syncStudentReminders(connection, req.user.userId);
    } else if (req.user.role === 'society_admin' || req.user.role === 'admin') {
      await syncOrganizerRegistrations(connection, req.user.userId);
    }

    if (req.user.role === 'admin') {
      await syncAdminApprovals(connection, req.user.userId);
    }

    const conditions = ['user_id = ?'];
    const params = [req.user.userId];

    if (unreadOnly === 'true') {
      conditions.push('is_read = 0');
    }

    // Filter out organizer approval notifications for society admins
    if (req.user.role === 'society_admin') {
      conditions.push(`NOT (title LIKE 'Organizer Account%' AND type = 'admin_alert')`);
    }

    if (category !== 'all') {
      if (category === 'event_registration') {
        conditions.push(`(type = 'registration_confirm' OR reference_type = 'event_registration')`);
      } else if (category === 'event_reminder') {
        conditions.push(`type = 'event_reminder'`);
      } else if (category === 'resource_approval') {
        conditions.push(`(type IN ('resource_approved', 'resource_rejected') OR reference_type = 'resource')`);
      } else if (category === 'society_announcement') {
        conditions.push(`(type = 'announcement' OR reference_type = 'announcement')`);
      } else if (category === 'approval') {
        conditions.push(`type = 'admin_alert'`);
      }
    }

    const [notifications] = await connection.query(
      `SELECT notification_id, user_id, title, message, type, reference_id, reference_type, is_read, created_at
       FROM notifications
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, numericLimit]
    );

    const mappedNotifications = notifications.map((notification) => ({
      ...notification,
      category: getNotificationCategory(notification),
    }));

    const unreadCount = mappedNotifications.filter((notification) => !notification.is_read).length;

    res.json({
      success: true,
      notifications: mappedNotifications,
      summary: {
        unreadCount,
        totalCount: mappedNotifications.length,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
    });
  } finally {
    connection.release();
  }
};

const markNotificationAsRead = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [result] = await connection.query(
      `UPDATE notifications
       SET is_read = 1
       WHERE notification_id = ? AND user_id = ?`,
      [id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  } finally {
    connection.release();
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.query(
      `UPDATE notifications
       SET is_read = 1
       WHERE user_id = ? AND is_read = 0`,
      [req.user.userId]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Error updating notifications' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};