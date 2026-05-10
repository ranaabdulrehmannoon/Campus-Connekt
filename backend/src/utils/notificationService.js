const { syncNotificationToMongoDB } = require('../sync/notificationSync');

const insertNotification = async (connection, {
  userId,
  title,
  message,
  type = 'general',
  referenceId = null,
  referenceType = null,
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  const [existing] = await connection.query(
    `SELECT notification_id
     FROM notifications
     WHERE user_id = ?
       AND title = ?
       AND message = ?
       AND type = ?
       AND COALESCE(reference_id, 0) = COALESCE(?, 0)
       AND COALESCE(reference_type, '') = COALESCE(?, '')
     LIMIT 1`,
    [userId, title, message, type, referenceId, referenceType]
  );

  if (existing.length > 0) {
    return existing[0].notification_id;
  }

  const [result] = await connection.query(
    `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, message, type, referenceId, referenceType]
  );

  // Sync to MongoDB
  const notificationData = {
    notification_id: result.insertId,
    user_id: userId,
    title,
    message,
    type,
    reference_id: referenceId,
    reference_type: referenceType,
    is_read: false,
    created_at: new Date(),
  };
  await syncNotificationToMongoDB(notificationData);

  return result.insertId;
};

const notifyUsers = async (connection, userIds, payload) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  for (const userId of uniqueUserIds) {
    await insertNotification(connection, { userId, ...payload });
  }
};

const notifyAdmins = async (connection, payload) => {
  const [admins] = await connection.query(
    `SELECT user_id
     FROM users
     WHERE role = 'admin' AND is_active = 1`
  );

  await notifyUsers(connection, admins.map((admin) => admin.user_id), payload);
};

module.exports = {
  insertNotification,
  notifyUsers,
  notifyAdmins,
};