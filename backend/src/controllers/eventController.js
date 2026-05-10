const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { insertNotification, notifyAdmins } = require('../utils/notificationService');
const { syncEventToMongoDB, updateEventInMongoDB } = require('../sync/eventSync');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '';
    cb(null, `event-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({ storage });

const mapEventRow = (event) => ({
  ...event,
  thumbnail_url: event.thumbnail ? `/uploads/${event.thumbnail}` : null,
});

const getEvents = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      category,
      status,
      society,
      date,
      search,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;
    
    // Build base query for public events, plus society-only events if user is a member
    let query = `
      SELECT e.*,
             s.society_id,
             CASE WHEN e.capacity IS NOT NULL 
                  THEN e.capacity - e.registered_count 
                  ELSE NULL END as spots_left
      FROM events e
      LEFT JOIN societies s ON s.society_id = e.society_id
      LEFT JOIN users u ON u.user_id = e.created_by
      WHERE e.is_approved = 1
        AND e.status IN ('open','closed','completed')
    `;
    
    // Add visibility filter
    if (req.user) {
      // For authenticated users, show:
      // 1. All public events
      // 2. Society-only events they're a member of
      query += ` AND (
        e.visibility = 'public'
        OR (e.visibility = 'society_only' AND e.society_id IN (
          SELECT society_id FROM society_members WHERE user_id = ? AND is_active = 1
        ))
      )`;
    } else {
      // For non-authenticated users, show only public events
      query += ` AND e.visibility = 'public'`;
    }
    
    const params = req.user ? [req.user.userId] : [];
    
    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }
    
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }

    if (society) {
      query += ' AND e.society_id = ?';
      params.push(society);
    }

    if (date) {
      query += ' AND DATE(e.start_datetime) = ?';
      params.push(date);
    }

    if (search) {
      query += ` AND (
        e.title LIKE ?
        OR e.description LIKE ?
        OR s.name LIKE ?
      )`;
      const wildcardSearch = `%${search}%`;
      params.push(wildcardSearch, wildcardSearch, wildcardSearch);
    }
    
    query += ' ORDER BY e.start_datetime ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [events] = await connection.query(query, params);
    
    // Get user's registration status for each event
    if (req.user && events.length > 0) {
      const eventIds = events.map(e => e.event_id);
      const [registrations] = await connection.query(
        `SELECT event_id, status FROM event_registrations 
         WHERE user_id = ? AND event_id IN (?)`,
        [req.user.userId, eventIds]
      );
      
      const regMap = {};
      registrations.forEach(reg => {
        regMap[reg.event_id] = reg.status;
      });
      
      events.forEach(event => {
        event.user_registration_status = regMap[event.event_id] || null;
      });

      const [ratings] = await connection.query(
        `SELECT entity_id, stars, review
         FROM ratings
         WHERE entity_type = 'event'
           AND user_id = ?
           AND entity_id IN (?)`,
        [req.user.userId, eventIds]
      );

      const ratingMap = {};
      ratings.forEach((rating) => {
        ratingMap[rating.entity_id] = {
          stars: rating.stars,
          review: rating.review,
        };
      });

      events.forEach((event) => {
        const userRating = ratingMap[event.event_id] || null;
        event.user_rating = userRating?.stars || null;
        event.user_review = userRating?.review || null;
      });
    }
    
    res.json({
      success: true,
      events: events.map(mapEventRow),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events'
    });
  } finally {
    connection.release();
  }
};

const getEventById = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    const [events] = await connection.query(
      `SELECT e.*, s.name as society_name, s.logo as society_logo,
              CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
              CASE WHEN e.capacity IS NOT NULL 
                   THEN e.capacity - e.registered_count 
                   ELSE NULL END as spots_left
       FROM events e
       LEFT JOIN societies s ON s.society_id = e.society_id
       JOIN users u ON u.user_id = e.created_by
       WHERE e.event_id = ? AND e.is_approved = 1`,
      [id]
    );
    
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = events[0];
    
    // Check visibility permissions
    if (event.visibility === 'society_only') {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: 'This is a society-only event'
        });
      }
      
      // Check if user is a member of the society
      const [membership] = await connection.query(
        `SELECT 1 FROM society_members 
         WHERE society_id = ? AND user_id = ? AND is_active = 1`,
        [event.society_id, req.user.userId]
      );
      
      if (membership.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'This is a society-only event'
        });
      }
    }
    
    // Get user registration status
    if (req.user) {
      const [registrations] = await connection.query(
        `SELECT status FROM event_registrations 
         WHERE event_id = ? AND user_id = ?`,
        [id, req.user.userId]
      );
      
      event.user_registration_status = registrations[0]?.status || null;

      const [userRatings] = await connection.query(
        `SELECT stars, review FROM ratings
         WHERE entity_type = 'event' AND entity_id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      event.user_rating = userRatings[0]?.stars || null;
      event.user_review = userRatings[0]?.review || null;
    }
    
    // Get event ratings
    const [ratings] = await connection.query(
      `SELECT AVG(stars) as avg_rating, COUNT(*) as total_ratings
       FROM ratings 
       WHERE entity_type = 'event' AND entity_id = ?`,
      [id]
    );
    
    event.avg_rating = ratings[0].avg_rating || 0;
    event.total_ratings = ratings[0].total_ratings || 0;
    
    res.json({
      success: true,
      event: mapEventRow(event)
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event'
    });
  } finally {
    connection.release();
  }
};

const registerForEvent = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [eventRows] = await connection.query(
      `SELECT e.event_id, e.title, e.created_by, CONCAT(u.first_name, ' ', u.last_name) AS organizer_name
       FROM events e
       JOIN users u ON u.user_id = e.created_by
       WHERE e.event_id = ?`,
      [id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = eventRows[0];
    
    // Prevent creator from registering for their own event
    if (event.created_by === userId) {
      return res.status(403).json({
        success: false,
        message: 'As the event creator, you cannot register for your own event. You have full access to manage it.'
      });
    }
    
    // Call stored procedure
    const [result] = await connection.query(
      'CALL sp_register_for_event(?, ?, @p_status, @p_message)',
      [userId, id]
    );
    
    const [statusResult] = await connection.query(
      'SELECT @p_status as status, @p_message as message'
    );
    
    const { status, message } = statusResult[0];
    
    if (status === 'error') {
      return res.status(400).json({
        success: false,
        message
      });
    }

    const [registrationRows] = await connection.query(
      `SELECT registration_id
       FROM event_registrations
       WHERE event_id = ? AND user_id = ?
       ORDER BY registered_at DESC
       LIMIT 1`,
      [id, userId]
    );

    const [studentRows] = await connection.query(
      `SELECT CONCAT(first_name, ' ', last_name) AS full_name
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    if (event.created_by !== userId && registrationRows[0]?.registration_id) {
      const notificationTitle = status === 'waitlisted' ? 'Event Waitlist Update' : 'New Event Registration';
      await insertNotification(connection, {
        userId: event.created_by,
        title: notificationTitle,
        message: status === 'waitlisted'
          ? `${studentRows[0]?.full_name || 'A student'} joined the waitlist for "${event.title}".`
          : `${studentRows[0]?.full_name || 'A student'} registered for "${event.title}".`,
        type: 'registration_confirm',
        referenceId: registrationRows[0].registration_id,
        referenceType: 'event_registration',
      });
    }
    
    res.json({
      success: true,
      message,
      registrationStatus: status
    });
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering for event'
    });
  } finally {
    connection.release();
  }
};

const cancelRegistration = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [eventRows] = await connection.query(
      `SELECT e.event_id, e.title, e.created_by, CONCAT(u.first_name, ' ', u.last_name) AS organizer_name
       FROM events e
       JOIN users u ON u.user_id = e.created_by
       WHERE e.event_id = ?`,
      [id]
    );
    
    const [result] = await connection.query(
      'CALL sp_cancel_registration(?, ?, @p_message)',
      [userId, id]
    );
    
    const [messageResult] = await connection.query(
      'SELECT @p_message as message'
    );

    if (eventRows.length > 0 && eventRows[0].created_by !== userId) {
      await insertNotification(connection, {
        userId: eventRows[0].created_by,
        title: 'Registration Update',
        message: `${eventRows[0].organizer_name || 'A participant'} cancelled registration for "${eventRows[0].title}".`,
        type: 'registration_confirm',
        referenceId: Number(id),
        referenceType: 'event_registration',
      });
    }
    
    res.json({
      success: true,
      message: messageResult[0].message
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling registration'
    });
  } finally {
    connection.release();
  }
};

const createEvent = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      title,
      description,
      society_id,
      location,
      start_datetime,
      end_datetime,
      category,
      capacity,
      registration_deadline,
      visibility
    } = req.body;
    const thumbnail = req.file?.filename || null;
    const societyId = req.body.society_id || null;
    
    // Determine if event needs approval:
    // - If it's a society-only event created by society admin, it doesn't need approval
    // - If it's a public event created by society admin, it needs approval
    // - If created by admin or student, different rules apply
    let needsApproval = true;
    
    if (req.user.role === 'society_admin' && societyId && visibility === 'society_only') {
      // Society-only events created by society admins don't need approval
      needsApproval = false;
    } else if (req.user.role === 'student') {
      // Student-created events need approval
      needsApproval = true;
    } else if (req.user.role === 'admin') {
      // Admin-created events don't need approval
      needsApproval = false;
    } else if (req.user.role === 'society_admin') {
      // Public events by society admins need approval
      needsApproval = true;
    }
    
    const [result] = await connection.query(
      `INSERT INTO events 
       (title, description, society_id, created_by, location, 
        start_datetime, end_datetime, category, capacity, 
        registration_deadline, visibility, thumbnail, status, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, societyId, req.user.userId, location,
       start_datetime, end_datetime, category, capacity,
       registration_deadline, visibility, thumbnail, needsApproval ? 'draft' : 'open', needsApproval ? 0 : 1]
    );

    // Sync to MongoDB
    const eventData = {
      event_id: result.insertId,
      title,
      description,
      society_id: societyId,
      created_by: req.user.userId,
      location,
      start_datetime: new Date(start_datetime),
      end_datetime: new Date(end_datetime),
      category,
      capacity,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : null,
      visibility,
      thumbnail,
      status: needsApproval ? 'draft' : 'open',
      is_approved: !needsApproval,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await syncEventToMongoDB(eventData);

    if (needsApproval) {
      await notifyAdmins(connection, {
        title: 'Event Approval Needed',
        message: `${title} is waiting for your review.`,
        type: 'admin_alert',
        referenceId: result.insertId,
        referenceType: 'event',
      });
    }
    
    res.status(201).json({
      success: true,
      message: needsApproval
        ? 'Event created successfully. It was submitted for approval.'
        : 'Event created successfully. It is now live for students.',
      eventId: result.insertId
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating event'
    });
  } finally {
    connection.release();
  }
};

const getMyEvents = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [events] = await connection.query(
      `SELECT e.*, s.name AS society_name,
              CONCAT(u.first_name, ' ', u.last_name) AS organizer_name,
              CASE WHEN e.capacity IS NOT NULL THEN e.capacity - e.registered_count ELSE NULL END AS spots_left,
              COUNT(er.registration_id) AS registrations_count
       FROM events e
       LEFT JOIN societies s ON s.society_id = e.society_id
       JOIN users u ON u.user_id = e.created_by
       LEFT JOIN event_registrations er ON er.event_id = e.event_id AND er.status IN ('confirmed', 'waitlisted')
       WHERE e.created_by = ?
       GROUP BY e.event_id
       ORDER BY e.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      events: events.map(mapEventRow),
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your events'
    });
  } finally {
    connection.release();
  }
};

const updateEvent = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const [existingRows] = await connection.query(
      'SELECT * FROM events WHERE event_id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const existingEvent = existingRows[0];
    if (req.user.role !== 'admin' && existingEvent.created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only edit your own events' });
    }

    const thumbnail = req.file?.filename || existingEvent.thumbnail;
    const societyId = req.body.society_id ?? existingEvent.society_id;

    await connection.query(
      `UPDATE events
       SET title = ?,
           description = ?,
           society_id = ?,
           location = ?,
           start_datetime = ?,
           end_datetime = ?,
           category = ?,
           capacity = ?,
           registration_deadline = ?,
           visibility = ?,
           thumbnail = ?
       WHERE event_id = ?`,
      [
        req.body.title ?? existingEvent.title,
        req.body.description ?? existingEvent.description,
        societyId,
        req.body.location ?? existingEvent.location,
        req.body.start_datetime ?? existingEvent.start_datetime,
        req.body.end_datetime ?? existingEvent.end_datetime,
        req.body.category ?? existingEvent.category,
        req.body.capacity ?? existingEvent.capacity,
        req.body.registration_deadline ?? existingEvent.registration_deadline,
        req.body.visibility ?? existingEvent.visibility,
        thumbnail,
        id,
      ]
    );

    // Sync to MongoDB
    await updateEventInMongoDB(id, {
      title: req.body.title ?? existingEvent.title,
      description: req.body.description ?? existingEvent.description,
      society_id: societyId,
      location: req.body.location ?? existingEvent.location,
      start_datetime: req.body.start_datetime ? new Date(req.body.start_datetime) : existingEvent.start_datetime,
      end_datetime: req.body.end_datetime ? new Date(req.body.end_datetime) : existingEvent.end_datetime,
      category: req.body.category ?? existingEvent.category,
      capacity: req.body.capacity ?? existingEvent.capacity,
      registration_deadline: req.body.registration_deadline ? new Date(req.body.registration_deadline) : existingEvent.registration_deadline,
      visibility: req.body.visibility ?? existingEvent.visibility,
      thumbnail,
    });

    const [updatedRows] = await connection.query(
      `SELECT e.*, s.name AS society_name,
              CONCAT(u.first_name, ' ', u.last_name) AS organizer_name,
              CASE WHEN e.capacity IS NOT NULL THEN e.capacity - e.registered_count ELSE NULL END AS spots_left
       FROM events e
       LEFT JOIN societies s ON s.society_id = e.society_id
       JOIN users u ON u.user_id = e.created_by
       WHERE e.event_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Event updated successfully',
      event: mapEventRow(updatedRows[0]),
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Error updating event' });
  } finally {
    connection.release();
  }
};

const deleteEvent = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const [existingRows] = await connection.query('SELECT * FROM events WHERE event_id = ?', [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const existingEvent = existingRows[0];
    if (req.user.role !== 'admin' && existingEvent.created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own events' });
    }

    await connection.query('DELETE FROM events WHERE event_id = ?', [id]);

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Error deleting event' });
  } finally {
    connection.release();
  }
};

const getEventParticipants = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const [existingRows] = await connection.query('SELECT created_by FROM events WHERE event_id = ?', [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && existingRows[0].created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only view participants for your own events' });
    }

    const [participants] = await connection.query(
      `SELECT er.registration_id, er.status, er.registered_at,
              u.user_id, u.first_name, u.last_name, u.email, u.department, u.batch_year
       FROM event_registrations er
       JOIN users u ON u.user_id = er.user_id
       WHERE er.event_id = ?
       ORDER BY er.registered_at DESC`,
      [id]
    );

    const registeredParticipants = participants.filter((participant) => participant.status === 'confirmed');
    const waitlistedParticipants = participants.filter((participant) => participant.status === 'waitlisted');

    res.json({
      success: true,
      participants: {
        all: participants,
        registered: registeredParticipants,
        waitlisted: waitlistedParticipants,
      },
    });
  } catch (error) {
    console.error('Get event participants error:', error);
    res.status(500).json({ success: false, message: 'Error fetching participants' });
  } finally {
    connection.release();
  }
};

const closeEventRegistration = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const [existingRows] = await connection.query('SELECT created_by FROM events WHERE event_id = ?', [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && existingRows[0].created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only close registration for your own events' });
    }

    await connection.query(
      `UPDATE events
       SET status = 'closed'
       WHERE event_id = ?`,
      [id]
    );

    res.json({ success: true, message: 'Event registration closed successfully' });
  } catch (error) {
    console.error('Close event registration error:', error);
    res.status(500).json({ success: false, message: 'Error closing registration' });
  } finally {
    connection.release();
  }
};

const openEventRegistration = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const [existingRows] = await connection.query('SELECT created_by FROM events WHERE event_id = ?', [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && existingRows[0].created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only open registration for your own events' });
    }

    await connection.query(
      `UPDATE events
       SET status = 'open'
       WHERE event_id = ? AND status <> 'cancelled'`,
      [id]
    );

    res.json({ success: true, message: 'Event registration opened successfully' });
  } catch (error) {
    console.error('Open event registration error:', error);
    res.status(500).json({ success: false, message: 'Error opening registration' });
  } finally {
    connection.release();
  }
};

const cancelParticipantRegistration = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id, registrationId } = req.params;

    const [existingRows] = await connection.query('SELECT created_by FROM events WHERE event_id = ?', [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && existingRows[0].created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You can only manage participants for your own events' });
    }

    const [participantRows] = await connection.query(
      `SELECT registration_id, user_id, status
       FROM event_registrations
       WHERE registration_id = ? AND event_id = ?
       LIMIT 1`,
      [registrationId, id]
    );

    if (participantRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    if (participantRows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Participant is already cancelled' });
    }

    await connection.query('CALL sp_cancel_registration(?, ?, @p_message)', [participantRows[0].user_id, id]);
    const [messageRows] = await connection.query('SELECT @p_message AS message');

    res.json({
      success: true,
      message: messageRows[0]?.message || 'Participant cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel participant error:', error);
    res.status(500).json({ success: false, message: 'Error cancelling participant' });
  } finally {
    connection.release();
  }
};

const approveEvent = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [eventRows] = await connection.query(
      `SELECT e.event_id, e.title, e.created_by, e.is_approved,
              CONCAT(u.first_name, ' ', u.last_name) AS organizer_name
       FROM events e
       JOIN users u ON u.user_id = e.created_by
       WHERE e.event_id = ?
       LIMIT 1`,
      [id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (eventRows[0].is_approved) {
      return res.status(400).json({ success: false, message: 'Event is already approved' });
    }

    await connection.query('CALL sp_approve_event(?, ?, @p_message)', [id, req.user.userId]);

    // Sync to MongoDB
    await updateEventInMongoDB(id, {
      is_approved: true,
      status: 'open',
      approved_by: req.user.userId,
      approved_at: new Date(),
    });

    const [messageRows] = await connection.query('SELECT @p_message AS message');

    if (eventRows[0].created_by !== req.user.userId) {
      await insertNotification(connection, {
        userId: eventRows[0].created_by,
        title: 'Event Approved',
        message: `Your event "${eventRows[0].title}" has been approved and is now open for registration.`,
        type: 'admin_alert',
        referenceId: Number(id),
        referenceType: 'event',
      });
    }

    res.json({
      success: true,
      message: messageRows[0]?.message || 'Event approved successfully',
    });
  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({ success: false, message: 'Error approving event' });
  } finally {
    connection.release();
  }
};

const rejectEvent = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [eventRows] = await connection.query(
      `SELECT e.event_id, e.title, e.created_by, e.is_approved, e.status
       FROM events e
       WHERE e.event_id = ?
       LIMIT 1`,
      [id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (eventRows[0].is_approved) {
      return res.status(400).json({ success: false, message: 'Approved events cannot be rejected from pending queue' });
    }

    if (eventRows[0].status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only pending draft events can be rejected' });
    }

    const [updateResult] = await connection.query(
      `UPDATE events
       SET status = 'cancelled',
           approved_by = ?,
           approved_at = NOW()
       WHERE event_id = ?
         AND is_approved = 0
         AND status = 'draft'`,
      [req.user.userId, id]
    );

    // Sync to MongoDB
    await updateEventInMongoDB(id, {
      status: 'cancelled',
      approved_by: req.user.userId,
      approved_at: new Date(),
    });

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Event not found in pending queue' });
    }

    if (eventRows[0].created_by !== req.user.userId) {
      await insertNotification(connection, {
        userId: eventRows[0].created_by,
        title: 'Event Rejected',
        message: `Your event "${eventRows[0].title}" was rejected during review.`,
        type: 'admin_alert',
        referenceId: Number(id),
        referenceType: 'event',
      });
    }

    res.json({ success: true, message: 'Event rejected successfully' });
  } catch (error) {
    console.error('Reject event error:', error);
    res.status(500).json({ success: false, message: 'Error rejecting event' });
  } finally {
    connection.release();
  }
};

const rateEvent = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { stars, review = null } = req.body;

    const parsedStars = Number(stars);
    if (!Number.isInteger(parsedStars) || parsedStars < 1 || parsedStars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be an integer from 1 to 5'
      });
    }

    const [eventRows] = await connection.query(
      'SELECT event_id, end_datetime FROM events WHERE event_id = ? AND is_approved = 1',
      [id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const [attendanceRows] = await connection.query(
      `SELECT status
       FROM event_registrations
       WHERE event_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (attendanceRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be registered for this event before rating it'
      });
    }

    const registrationStatus = attendanceRows[0].status;
    const eventEnded = new Date(eventRows[0].end_datetime) <= new Date();
    const canRate = registrationStatus === 'attended' || (registrationStatus === 'confirmed' && eventEnded);

    if (!canRate) {
      return res.status(403).json({
        success: false,
        message: 'You can rate this event after attending it'
      });
    }

    await connection.query(
      `INSERT INTO ratings (user_id, entity_type, entity_id, stars, review)
       VALUES (?, 'event', ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stars = VALUES(stars),
         review = VALUES(review),
         created_at = CURRENT_TIMESTAMP`,
      [userId, id, parsedStars, review]
    );

    res.json({
      success: true,
      message: 'Thank you for reviewing the event'
    });
  } catch (error) {
    console.error('Rate event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting event rating'
    });
  } finally {
    connection.release();
  }
};

const getEventReviews = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [reviews] = await connection.query(
      `SELECT stars, review, created_at 
       FROM ratings 
       WHERE entity_type = 'event' AND entity_id = ? AND review IS NOT NULL AND review != ''
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get event reviews error:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getEvents,
  getEventById,
  registerForEvent,
  cancelRegistration,
  createEvent,
  getMyEvents,
  updateEvent,
  deleteEvent,
  getEventParticipants,
  closeEventRegistration,
  approveEvent,
  rejectEvent,
  openEventRegistration,
  cancelParticipantRegistration,
  rateEvent,
  upload,
  getEventReviews
};