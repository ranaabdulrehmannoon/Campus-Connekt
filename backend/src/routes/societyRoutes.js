const express = require('express');
const { protect, optionalProtect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const {
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
} = require('../controllers/societyController');

const router = express.Router();

router.get('/', optionalProtect, getSocieties);
router.get('/admin/all', protect, roleCheck('admin'), getAdminSocieties);
router.get('/pending', protect, roleCheck('admin'), getPendingSocieties);
router.post('/', protect, roleCheck('society_admin', 'admin'), upload.single('logo'), createSociety);
router.patch('/:id', protect, roleCheck('society_admin', 'admin'), upload.single('logo'), updateSociety);
router.delete('/:id', protect, roleCheck('admin'), deleteSociety);

router.get('/:id', optionalProtect, getSocietyById);
router.post('/:id/join', protect, joinSociety);
router.delete('/:id/join', protect, leaveSociety);

router.get('/:id/dashboard', protect, roleCheck('society_admin', 'admin'), getSocietyDashboard);
router.post('/:id/announcements', protect, roleCheck('society_admin', 'admin'), createAnnouncement);
router.patch('/:id/announcements/:announcementId', protect, roleCheck('society_admin', 'admin'), updateAnnouncement);
router.delete('/:id/announcements/:announcementId', protect, roleCheck('society_admin', 'admin'), deleteAnnouncement);
router.post('/:id/members', protect, roleCheck('society_admin', 'admin'), addMemberByEmail);
router.patch('/:id/members/:memberUserId/role', protect, roleCheck('society_admin', 'admin'), updateMemberRole);
router.delete('/:id/members/:memberUserId', protect, roleCheck('society_admin', 'admin'), removeMember);

router.patch('/:id/approve', protect, roleCheck('admin'), approveSociety);
router.patch('/:id/reject', protect, roleCheck('admin'), rejectSociety);

module.exports = router;