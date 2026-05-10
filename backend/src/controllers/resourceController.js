const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/database');
const { notifyAdmins } = require('../utils/notificationService');
const { syncResourceToMongoDB, updateResourceInMongoDB } = require('../sync/resourceSync');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const resourceUploadsDir = path.join(uploadsRoot, 'resources');
const responseUploadsDir = path.join(uploadsRoot, 'request-responses');

if (!fs.existsSync(resourceUploadsDir)) {
  fs.mkdirSync(resourceUploadsDir, { recursive: true });
}

if (!fs.existsSync(responseUploadsDir)) {
  fs.mkdirSync(responseUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resourceUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '';
    cb(null, `resource-${uniqueSuffix}${extension}`);
  },
});

const responseStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, responseUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '';
    cb(null, `response-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({ storage });
const responseUpload = multer({ storage: responseStorage });

const mapResourceRow = (resource) => ({
  ...resource,
  file_url: resource.file_path ? `/uploads/${resource.file_path}` : null,
  download_url: `/api/resources/${resource.resource_id}/download`,
});

const getResources = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { search, subject, type, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT r.*
      FROM vw_public_resources r
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (r.title LIKE ? OR r.description LIKE ? OR r.subject LIKE ? OR r.uploaded_by_name LIKE ?)`;
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }

    if (subject) {
      query += ' AND r.subject = ?';
      params.push(subject);
    }

    if (type) {
      query += ' AND r.resource_type = ?';
      params.push(type);
    }

    query += ' ORDER BY r.approved_at DESC, r.resource_id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [resources] = await connection.query(query, params);

    if (req.user && resources.length > 0) {
      const resourceIds = resources.map((resource) => resource.resource_id);
      const [ratings] = await connection.query(
        `SELECT entity_id, stars, review
         FROM ratings
         WHERE entity_type = 'resource'
           AND user_id = ?
           AND entity_id IN (?)`,
        [req.user.userId, resourceIds]
      );

      const ratingMap = new Map();
      ratings.forEach((rating) => {
        ratingMap.set(rating.entity_id, rating);
      });

      resources.forEach((resource) => {
        const userRating = ratingMap.get(resource.resource_id);
        resource.user_rating = userRating?.stars || null;
        resource.user_review = userRating?.review || null;
      });
    }

    res.json({
      success: true,
      resources: resources.map(mapResourceRow),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resources',
    });
  } finally {
    connection.release();
  }
};

const getResourceById = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [resources] = await connection.query(
      `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) AS uploader_name, u.email AS uploader_email
       FROM resources r
       JOIN users u ON u.user_id = r.uploaded_by
       WHERE r.resource_id = ? AND r.status = 'approved'`,
      [id]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const resource = resources[0];

    const [summary] = await connection.query(
      `SELECT AVG(stars) AS avg_rating, COUNT(*) AS rating_count
       FROM ratings
       WHERE entity_type = 'resource' AND entity_id = ?`,
      [id]
    );

    resource.avg_rating = Number(summary[0].avg_rating || 0);
    resource.rating_count = Number(summary[0].rating_count || 0);

    if (req.user) {
      const [userRatings] = await connection.query(
        `SELECT stars, review
         FROM ratings
         WHERE entity_type = 'resource' AND entity_id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      resource.user_rating = userRatings[0]?.stars || null;
      resource.user_review = userRatings[0]?.review || null;
    }

    res.json({
      success: true,
      resource: mapResourceRow(resource),
    });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resource',
    });
  } finally {
    connection.release();
  }
};

const uploadResource = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { title, description, subject, externalUrl } = req.body;
    const file = req.file || null;

    if (!title || !description || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and subject are required',
      });
    }

    if (!file && !externalUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a file or an external link',
      });
    }

    if (file && externalUrl) {
      return res.status(400).json({
        success: false,
        message: 'Choose either a file or an external link, not both',
      });
    }

    const resourceType = externalUrl ? 'link' : 'other';
    const filePath = file ? `resources/${file.filename}` : null;
    const fileSize = file ? file.size : null;

    const [result] = await connection.query(
      `INSERT INTO resources
       (title, description, uploaded_by, subject, resource_type, file_path, external_url, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [title, description, req.user.userId, subject, resourceType, filePath, externalUrl || null, fileSize]
    );

    // Sync to MongoDB
    const resourceData = {
      resource_id: result.insertId,
      title,
      description,
      uploaded_by: req.user.userId,
      subject,
      resource_type: resourceType,
      file_path: filePath,
      external_url: externalUrl || null,
      file_size: fileSize,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
    await syncResourceToMongoDB(resourceData);

    await notifyAdmins(connection, {
      title: 'Resource Approval Needed',
      message: `New resource "${title}" was submitted and is waiting for review.`,
      type: 'admin_alert',
      referenceId: result.insertId,
      referenceType: 'resource',
    });

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully and is pending approval',
      resourceId: result.insertId,
    });
  } catch (error) {
    console.error('Upload resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading resource',
    });
  } finally {
    connection.release();
  }
};

const createResourceRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { title, description = null, subject = null } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const [result] = await connection.query(
      `INSERT INTO resource_requests (user_id, title, description, subject, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [req.user.userId, String(title).trim(), description || null, subject || null]
    );

    res.status(201).json({
      success: true,
      message: 'Resource request created successfully',
      requestId: result.insertId,
    });
  } catch (error) {
    console.error('Create resource request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating resource request',
    });
  } finally {
    connection.release();
  }
};

const getMyResourceRequests = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [requests] = await connection.query(
      `SELECT rr.request_id, rr.title, rr.description, rr.subject, rr.status, rr.created_at, rr.updated_at,
              rr.fulfilled_by, rr.resource_id,
              CONCAT(u.first_name, ' ', u.last_name) AS fulfilled_by_name,
              r.title AS resource_title
       FROM resource_requests rr
       LEFT JOIN users u ON u.user_id = rr.fulfilled_by
       LEFT JOIN resources r ON r.resource_id = rr.resource_id
       WHERE rr.user_id = ?
       ORDER BY rr.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Get my resource requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resource requests',
    });
  } finally {
    connection.release();
  }
};

const downloadResource = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [resources] = await connection.query(
      `SELECT resource_id, title, file_path, external_url, status
       FROM resources
       WHERE resource_id = ?`,
      [id]
    );

    if (resources.length === 0 || resources[0].status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    await connection.query('CALL sp_download_resource(?, ?)', [id, req.user?.userId || null]);

    const resource = resources[0];

    if (resource.external_url) {
      return res.redirect(resource.external_url);
    }

    if (!resource.file_path) {
      return res.status(404).json({
        success: false,
        message: 'Resource file is not available',
      });
    }

    const filePath = path.join(uploadsRoot, resource.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resource file is missing from storage',
      });
    }

    return res.download(filePath, path.basename(filePath));
  } catch (error) {
    console.error('Download resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading resource',
    });
  } finally {
    connection.release();
  }
};

const rateResource = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { stars, review = null } = req.body;
    const parsedStars = Number(stars);

    if (!Number.isInteger(parsedStars) || parsedStars < 1 || parsedStars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be an integer from 1 to 5',
      });
    }

    const [resourceRows] = await connection.query(
      'SELECT resource_id FROM resources WHERE resource_id = ? AND status = "approved"',
      [id]
    );

    if (resourceRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    await connection.query(
      `INSERT INTO ratings (user_id, entity_type, entity_id, stars, review)
       VALUES (?, 'resource', ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stars = VALUES(stars),
         review = VALUES(review),
         created_at = CURRENT_TIMESTAMP`,
      [req.user.userId, id, parsedStars, review]
    );

    res.json({
      success: true,
      message: 'Thank you for rating the resource',
    });
  } catch (error) {
    console.error('Rate resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting resource rating',
    });
  } finally {
    connection.release();
  }
};

const getPendingResources = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [resources] = await connection.query(
      `SELECT r.resource_id, r.title, r.description, r.subject, r.resource_type,
              r.file_path, r.external_url, r.file_size, r.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
              u.email AS uploaded_by_email
       FROM resources r
       JOIN users u ON u.user_id = r.uploaded_by
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    );

    res.json({
      success: true,
      resources: resources.map(mapResourceRow),
    });
  } catch (error) {
    console.error('Get pending resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending resources',
    });
  } finally {
    connection.release();
  }
};

const setResourceApproval = async (req, res, approve) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    await connection.query('CALL sp_approve_resource(?, ?, ?, @p_message)', [id, req.user.userId, approve ? 1 : 0]);

    // Sync to MongoDB
    await updateResourceInMongoDB(id, {
      status: approve ? 'approved' : 'rejected',
      approved_by: req.user.userId,
      approved_at: new Date(),
    });

    const [messageResult] = await connection.query('SELECT @p_message AS message');

    res.json({
      success: true,
      message: messageResult[0]?.message || (approve ? 'Resource approved.' : 'Resource rejected.'),
    });
  } catch (error) {
    console.error('Set resource approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating resource approval',
    });
  } finally {
    connection.release();
  }
};

const approveResource = async (req, res) => setResourceApproval(req, res, true);
const rejectResource = async (req, res) => setResourceApproval(req, res, false);

const getAllResourceRequests = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { status = 'open', search = '', subject = '' } = req.query;
    
    let query = `
      SELECT rr.request_id, rr.title, rr.description, rr.subject, rr.status, rr.created_at, rr.updated_at,
             CONCAT(creator.first_name, ' ', creator.last_name) AS requester_name,
             creator.user_id AS requester_id,
             COUNT(rresp.response_id) AS response_count
      FROM resource_requests rr
      JOIN users creator ON creator.user_id = rr.user_id
      LEFT JOIN request_responses rresp ON rresp.request_id = rr.request_id
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      query += ' AND rr.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (rr.title LIKE ? OR rr.description LIKE ?)';
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard);
    }

    if (subject) {
      query += ' AND rr.subject = ?';
      params.push(subject);
    }

    query += `
      GROUP BY rr.request_id
      ORDER BY rr.created_at DESC
    `;

    const [requests] = await connection.query(query, params);

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Get all resource requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resource requests',
    });
  } finally {
    connection.release();
  }
};

const createRequestResponse = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { request_id } = req.params;
    const { response_text } = req.body;
    const file = req.file || null;

    if (!response_text || !response_text.trim()) {
      if (file) {
        // Clean up file if response text is missing
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Response text is required',
      });
    }

    // Check if the request exists and get the creator's ID
    const [requestData] = await connection.query(
      `SELECT request_id, user_id FROM resource_requests WHERE request_id = ?`,
      [request_id]
    );

    if (requestData.length === 0) {
      if (file) {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    // Prevent the creator from responding to their own request
    if (requestData[0].user_id === req.user.userId) {
      if (file) {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(403).json({
        success: false,
        message: 'You cannot respond to your own request',
      });
    }

    const filePath = file ? `request-responses/${file.filename}` : null;
    const fileSize = file ? file.size : null;

    const [result] = await connection.query(
      `INSERT INTO request_responses (request_id, user_id, response_text, file_path, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [request_id, req.user.userId, response_text.trim(), filePath, fileSize]
    );

    res.json({
      success: true,
      message: 'Response added successfully',
      responseId: result.insertId,
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    console.error('Create request response error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding response',
    });
  } finally {
    connection.release();
  }
};

const getRequestResponses = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { request_id } = req.params;

    const [responses] = await connection.query(
      `SELECT rresp.response_id, rresp.request_id, rresp.user_id, rresp.response_text, 
              rresp.file_path, rresp.file_size, rresp.created_at, rresp.updated_at,
              CONCAT(u.first_name, ' ', u.last_name) AS user_name,
              u.role,
              u.profile_picture
       FROM request_responses rresp
       JOIN users u ON u.user_id = rresp.user_id
       WHERE rresp.request_id = ?
       ORDER BY rresp.created_at ASC`,
      [request_id]
    );

    // Map file URLs if files exist
    const mappedResponses = responses.map((response) => ({
      ...response,
      file_url: response.file_path ? `/uploads/${response.file_path}` : null,
      download_url: response.file_path ? `/api/resources/requests/${request_id}/responses/${response.response_id}/download` : null,
    }));

    res.json({
      success: true,
      responses: mappedResponses,
    });
  } catch (error) {
    console.error('Get request responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching responses',
    });
  } finally {
    connection.release();
  }
};

const downloadResponseFile = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { request_id, response_id } = req.params;

    // Verify the response exists and get file path
    const [responses] = await connection.query(
      `SELECT rr.user_id, rresp.file_path, rresp.response_id
       FROM request_responses rresp
       JOIN resource_requests rr ON rr.request_id = rresp.request_id
       WHERE rresp.response_id = ? AND rresp.request_id = ?`,
      [response_id, request_id]
    );

    if (responses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Response not found',
      });
    }

    const response = responses[0];

    // Only allow the request creator to download the file
    if (response.user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download this file',
      });
    }

    if (!response.file_path) {
      return res.status(404).json({
        success: false,
        message: 'No file attached to this response',
      });
    }

    const filePath = path.join(uploadsRoot, response.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    return res.download(filePath, path.basename(filePath));
  } catch (error) {
    console.error('Download response file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  upload,
  responseUpload,
  getResources,
  getResourceById,
  uploadResource,
  createResourceRequest,
  getMyResourceRequests,
  getAllResourceRequests,
  downloadResource,
  rateResource,
  getPendingResources,
  approveResource,
  rejectResource,
  createRequestResponse,
  getRequestResponses,
  downloadResponseFile,
};