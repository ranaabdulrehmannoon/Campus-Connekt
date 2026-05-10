const express = require('express');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, roleCheck('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/approval', decideUserApproval);
router.delete('/users/:id', deleteUserAccount);
router.get('/users/:id/activity', getUserActivity);

router.get('/audit', getAuditLogs);

router.post('/notifications/global', sendGlobalNotification);

router.get('/issues', getReportedIssues);
router.patch('/issues/:id/status', resolveReportedIssue);

module.exports = router;
