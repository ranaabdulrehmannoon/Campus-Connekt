const pool = require('../config/database');

const getStudentSummary = async (connection, userId) => {
  const [registeredEventsResult, societiesResult, resourcesResult, notificationsResult, recentEventsResult, joinedSocietiesResult, upcomingEventsResult, trendingEventsResult] = await Promise.all([
    connection.query(
      `SELECT COUNT(*) AS total
       FROM event_registrations er
       JOIN events e ON e.event_id = er.event_id
       WHERE er.user_id = ? AND er.status IN ('confirmed', 'waitlisted')`,
      [userId]
    ),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM society_members
       WHERE user_id = ? AND is_active = 1`,
      [userId]
    ),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM resources
       WHERE uploaded_by = ?`,
      [userId]
    ),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM notifications
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    ),
    connection.query(
      `SELECT e.event_id, e.title, e.start_datetime, e.location, er.status AS registration_status
       FROM event_registrations er
       JOIN events e ON e.event_id = er.event_id
       WHERE er.user_id = ? AND er.status IN ('confirmed', 'waitlisted')
       ORDER BY e.start_datetime ASC
       LIMIT 5`,
      [userId]
    ),
    connection.query(
      `SELECT s.society_id, s.name, s.category, s.logo, sm.role, sm.joined_at
       FROM society_members sm
       JOIN societies s ON s.society_id = sm.society_id
       WHERE sm.user_id = ? AND sm.is_active = 1
       ORDER BY sm.joined_at DESC`,
      [userId],
    ),
    connection.query(
      `SELECT e.event_id, e.title, e.description, e.start_datetime, e.end_datetime, e.location,
        e.category, e.capacity, e.registered_count, ev.society_id AS society_id,
        e.society_name, e.society_logo,
              CASE WHEN e.capacity IS NOT NULL THEN e.capacity - e.registered_count ELSE NULL END AS spots_left,
              CASE WHEN er.registration_id IS NOT NULL THEN er.status ELSE NULL END AS user_registration_status
       FROM vw_public_events e
      LEFT JOIN events ev ON ev.event_id = e.event_id
       LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.user_id = ? AND er.status IN ('confirmed', 'waitlisted')
       WHERE e.status = 'open' AND e.start_datetime >= NOW()
       ORDER BY e.start_datetime ASC, e.registered_count DESC
       LIMIT 6`,
      [userId],
    ),
    connection.query(
      `SELECT e.event_id, e.title, e.description, e.start_datetime, e.end_datetime, e.location,
        e.category, e.capacity, e.registered_count, ev.society_id AS society_id,
        e.society_name, e.society_logo,
              CASE WHEN e.capacity IS NOT NULL THEN e.capacity - e.registered_count ELSE NULL END AS spots_left,
              CASE WHEN er.registration_id IS NOT NULL THEN er.status ELSE NULL END AS user_registration_status
       FROM vw_public_events e
      LEFT JOIN events ev ON ev.event_id = e.event_id
       LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.user_id = ? AND er.status IN ('confirmed', 'waitlisted')
       WHERE e.status = 'open' AND e.start_datetime >= NOW()
       ORDER BY e.registered_count DESC, e.start_datetime ASC
       LIMIT 6`,
      [userId],
    ),
  ]);

  const joinedSocieties = joinedSocietiesResult[0];
  const joinedSocietyIds = joinedSocieties.map((society) => society.society_id);
  let latestAnnouncementsRows = [];
  let recommendedEventsRows = [];

  if (joinedSocietyIds.length > 0) {
    [latestAnnouncementsRows] = await connection.query(
      `SELECT a.announcement_id, a.title, a.content, a.is_pinned, a.created_at,
              s.society_id, s.name AS society_name, s.category AS society_category, s.logo AS society_logo,
              CONCAT(u.first_name, ' ', u.last_name) AS posted_by_name
       FROM announcements a
       JOIN societies s ON s.society_id = a.society_id
       JOIN users u ON u.user_id = a.created_by
       WHERE a.society_id IN (?)
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 6`,
      [joinedSocietyIds],
    );

    [recommendedEventsRows] = await connection.query(
      `SELECT e.event_id, e.title, e.description, e.start_datetime, e.end_datetime, e.location,
              e.category, e.capacity, e.registered_count, ev.society_id AS society_id,
              e.society_name, e.society_logo,
              CASE WHEN e.capacity IS NOT NULL THEN e.capacity - e.registered_count ELSE NULL END AS spots_left,
              CASE WHEN er.registration_id IS NOT NULL THEN er.status ELSE NULL END AS user_registration_status
       FROM vw_public_events e
       LEFT JOIN events ev ON ev.event_id = e.event_id
       LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.user_id = ? AND er.status IN ('confirmed', 'waitlisted')
       WHERE e.status = 'open'
         AND e.start_datetime >= NOW()
         AND ev.society_id IN (?)
         AND er.registration_id IS NULL
       ORDER BY e.registered_count DESC, e.start_datetime ASC
       LIMIT 6`,
      [userId, joinedSocietyIds],
    );
  } else {
    [recommendedEventsRows] = await connection.query(
      `SELECT e.event_id, e.title, e.description, e.start_datetime, e.end_datetime, e.location,
              e.category, e.capacity, e.registered_count, ev.society_id AS society_id,
              e.society_name, e.society_logo,
              CASE WHEN e.capacity IS NOT NULL THEN e.capacity - e.registered_count ELSE NULL END AS spots_left,
              CASE WHEN er.registration_id IS NOT NULL THEN er.status ELSE NULL END AS user_registration_status
       FROM vw_public_events e
       LEFT JOIN events ev ON ev.event_id = e.event_id
       LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.user_id = ? AND er.status IN ('confirmed', 'waitlisted')
       WHERE e.status = 'open'
         AND e.start_datetime >= NOW()
         AND er.registration_id IS NULL
       ORDER BY e.registered_count DESC, e.start_datetime ASC
       LIMIT 6`,
      [userId],
    );
  }

  return {
    metrics: [
      { label: 'Registered events', value: Number(registeredEventsResult[0][0]?.total || 0) },
      { label: 'Joined societies', value: Number(societiesResult[0][0]?.total || 0) },
      { label: 'Uploaded resources', value: Number(resourcesResult[0][0]?.total || 0) },
      { label: 'Unread notifications', value: Number(notificationsResult[0][0]?.total || 0) },
    ],
    recentItems: recentEventsResult[0].map((event) => ({
      id: event.event_id,
      title: event.title,
      subtitle: `${event.registration_status} · ${event.location || 'No location'}`,
      meta: event.start_datetime,
    })),
    joinedSocieties,
    upcomingEvents: upcomingEventsResult[0],
    latestAnnouncements: latestAnnouncementsRows,
    recommendedEvents: recommendedEventsRows,
    trendingEvents: trendingEventsResult[0],
  };
};

const getSocietyAdminSummary = async (connection, userId) => {
  const [eventsResult, registrationsResult, resourcesResult, pendingResourcesResult, recentEventsResult, eventStatusResult, popularEventsResult, upcomingEventsResult] = await Promise.all([
    connection.query(
      `SELECT COUNT(*) AS total
       FROM events
       WHERE created_by = ?`,
      [userId]
    ),
    connection.query(
      `SELECT COUNT(er.registration_id) AS total
       FROM events e
       LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.status IN ('confirmed', 'waitlisted')
       WHERE e.created_by = ?`,
      [userId]
    ),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM resources
       WHERE uploaded_by = ? AND status = 'approved'`,
      [userId]
    ),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM resources
       WHERE uploaded_by = ? AND status = 'pending'`,
      [userId]
    ),
    connection.query(
      `SELECT e.event_id, e.title, e.status, e.start_datetime, e.registered_count
       FROM events e
       WHERE e.created_by = ?
       ORDER BY e.created_at DESC
       LIMIT 5`,
      [userId]
    ),
    connection.query(
      `SELECT status, COUNT(*) AS total
       FROM events
       WHERE created_by = ?
       GROUP BY status`,
      [userId]
    ),
    connection.query(
      `SELECT e.event_id, e.title, e.status, e.registered_count, e.capacity,
              CASE WHEN e.capacity IS NULL THEN NULL ELSE ROUND((e.registered_count / NULLIF(e.capacity, 0)) * 100) END AS fill_rate
       FROM events e
       WHERE e.created_by = ?
       ORDER BY e.registered_count DESC, e.created_at DESC
       LIMIT 5`,
      [userId]
    ),
    connection.query(
      `SELECT e.event_id, e.title, e.start_datetime, e.location, e.status, e.registered_count
       FROM events e
       WHERE e.created_by = ?
         AND e.status IN ('open', 'closed')
       ORDER BY e.start_datetime ASC
       LIMIT 5`,
      [userId]
    ),
  ]);

  const eventStatusRows = eventStatusResult[0];
  const eventPopularRows = popularEventsResult[0];
  const upcomingOrganizerEvents = upcomingEventsResult[0];
  const totalRegistrations = Number(registrationsResult[0][0]?.total || 0);
  const totalEvents = Number(eventsResult[0][0]?.total || 0);
  const openEvents = Number(eventStatusRows.find((row) => row.status === 'open')?.total || 0);
  const draftEvents = Number(eventStatusRows.find((row) => row.status === 'draft')?.total || 0);

  return {
    metrics: [
      { label: 'Created events', value: totalEvents },
      { label: 'Event registrations', value: totalRegistrations },
      { label: 'Open events', value: openEvents },
      { label: 'Draft events', value: draftEvents },
      { label: 'Approved resources', value: Number(resourcesResult[0][0]?.total || 0) },
      { label: 'Pending uploads', value: Number(pendingResourcesResult[0][0]?.total || 0) },
    ],
    breakdowns: {
      eventsByStatus: eventStatusRows.map((row) => ({ label: row.status, value: Number(row.total || 0) })),
      popularEvents: eventPopularRows.map((row) => ({
        id: row.event_id,
        title: row.title,
        subtitle: `${row.status} · ${row.registered_count || 0} registrations`,
        meta: row.fill_rate !== null ? `${row.fill_rate}% full` : 'Unlimited capacity',
      })),
      upcomingEvents: upcomingOrganizerEvents.map((row) => ({
        id: row.event_id,
        title: row.title,
        subtitle: `${row.status} · ${row.location || 'No location'}`,
        meta: row.start_datetime,
      })),
    },
    recentItems: recentEventsResult[0].map((event) => ({
      id: event.event_id,
      title: event.title,
      subtitle: `${event.status} · ${event.registered_count || 0} registrations`,
      meta: event.start_datetime,
    })),
  };
};

const getAdminSummary = async (connection) => {
  const [usersResult, eventsResult, pendingApprovalsResult, resourcesResult, recentApprovalsResult, totalUsersResult, totalEventsResult, totalResourcesResult] = await Promise.all([
    connection.query(
      `SELECT role, COUNT(*) AS total
       FROM users
       WHERE is_active = 1
       GROUP BY role`),
    connection.query(
      `SELECT status, COUNT(*) AS total
       FROM events
       GROUP BY status`),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM vw_pending_approvals`),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM resources
       WHERE status = 'approved'`),
    connection.query(
      `SELECT item_type, item_id, title, submitted_by, submitted_at
       FROM vw_pending_approvals
       ORDER BY submitted_at DESC
       LIMIT 50`),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM users`),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM events`),
    connection.query(
      `SELECT COUNT(*) AS total
       FROM resources`),
  ]);

  const usersByRole = usersResult[0].map((row) => ({ label: row.role, value: Number(row.total || 0) }));
  const eventsByStatus = eventsResult[0].map((row) => ({ label: row.status, value: Number(row.total || 0) }));
  const totalUsers = Number(totalUsersResult[0][0]?.total || 0);
  const activeUsers = usersByRole.reduce((total, item) => total + item.value, 0);
  const totalEvents = Number(totalEventsResult[0][0]?.total || 0);
  const totalResources = Number(totalResourcesResult[0][0]?.total || 0);

  return {
    metrics: [
      { label: 'Total users', value: totalUsers },
      { label: 'Active users', value: activeUsers },
      { label: 'Total events', value: totalEvents },
      { label: 'Total resources', value: totalResources },
      { label: 'Pending approvals', value: Number(pendingApprovalsResult[0][0]?.total || 0) },
      { label: 'Approved resources', value: Number(resourcesResult[0][0]?.total || 0) },
    ],
    breakdowns: {
      usersByRole,
      eventsByStatus,
    },
    recentItems: recentApprovalsResult[0].map((item) => ({
      item_type: item.item_type,
      item_id: item.item_id,
      id: `${item.item_type}-${item.item_id}`,
      title: item.title,
      subtitle: `${item.item_type} · ${item.submitted_by}`,
      meta: item.submitted_at,
    })),
  };
};

const getSummary = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const role = req.user.role;
    let payload;

    if (role === 'student') {
      payload = await getStudentSummary(connection, req.user.userId);
    } else if (role === 'society_admin') {
      payload = await getSocietyAdminSummary(connection, req.user.userId);
    } else {
      payload = await getAdminSummary(connection);
    }

    res.json({
      success: true,
      role,
      ...payload,
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
    });
  } finally {
    connection.release();
  }
};

module.exports = { getSummary };