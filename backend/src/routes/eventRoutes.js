const express = require('express');
const {
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
  getEventReviews
} = require('../controllers/eventController');
const { protect, optionalProtect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { upload } = require('../controllers/eventController');

const router = express.Router();

router.get('/', optionalProtect, getEvents);
router.get('/my-events', protect, roleCheck('society_admin', 'admin'), getMyEvents);
router.get('/:id', optionalProtect, getEventById);
router.post('/', protect, roleCheck('society_admin', 'admin'), upload.single('thumbnail'), createEvent);
router.put('/:id', protect, roleCheck('society_admin', 'admin'), upload.single('thumbnail'), updateEvent);
router.delete('/:id', protect, roleCheck('society_admin', 'admin'), deleteEvent);
router.get('/:id/participants', protect, roleCheck('society_admin', 'admin'), getEventParticipants);
router.patch('/:id/close-registration', protect, roleCheck('society_admin', 'admin'), closeEventRegistration);
router.patch('/:id/approve', protect, roleCheck('admin'), approveEvent);
router.patch('/:id/reject', protect, roleCheck('admin'), rejectEvent);
router.patch('/:id/open-registration', protect, roleCheck('society_admin', 'admin'), openEventRegistration);
router.patch('/:id/participants/:registrationId/cancel', protect, roleCheck('society_admin', 'admin'), cancelParticipantRegistration);
router.post('/:id/register', protect, registerForEvent);
router.delete('/:id/register', protect, cancelRegistration);
router.post('/:id/rate', protect, rateEvent);
router.get('/:id/reviews', protect, getEventReviews);

module.exports = router;
