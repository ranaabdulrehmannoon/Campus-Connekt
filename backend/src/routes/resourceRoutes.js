const express = require('express');
const { protect, optionalProtect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const {
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
} = require('../controllers/resourceController');

const router = express.Router();

router.get('/', optionalProtect, getResources);
router.get('/pending', protect, roleCheck('admin'), getPendingResources);
router.get('/requests/all', protect, getAllResourceRequests);
router.get('/requests/mine', protect, getMyResourceRequests);
router.post('/requests', protect, createResourceRequest);
router.get('/requests/:request_id/responses', protect, getRequestResponses);
router.post('/requests/:request_id/responses', protect, responseUpload.single('responseFile'), createRequestResponse);
router.get('/requests/:request_id/responses/:response_id/download', protect, downloadResponseFile);
router.get('/:id/download', optionalProtect, downloadResource);
router.get('/:id', optionalProtect, getResourceById);
router.post('/', protect, upload.single('resourceFile'), uploadResource);
router.post('/:id/rate', protect, rateResource);
router.patch('/:id/approve', protect, roleCheck('admin'), approveResource);
router.patch('/:id/reject', protect, roleCheck('admin'), rejectResource);

module.exports = router;