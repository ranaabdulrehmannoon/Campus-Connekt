const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyEmailCode,
  resendVerificationCode,
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  getSecurityQuestions,
  upsertSecurityQuestions,
  getSecurityAuditLogs,
  uploadAvatar,
  avatarUpload,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty()
  ],
  register
);

router.post('/login', login);
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], forgotPassword);
router.post('/reset-password', [body('token').notEmpty(), body('password').isLength({ min: 6 })], resetPassword);
router.get('/verify/:token', verifyEmail);
router.post('/verify-code', [body('email').isEmail().normalizeEmail(), body('code').notEmpty()], verifyEmailCode);
router.post('/resend-verification-code', [body('email').isEmail().normalizeEmail()], resendVerificationCode);
router.get('/me', protect, getMe);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);
router.get('/security-questions', protect, getSecurityQuestions);
router.put('/security-questions', protect, upsertSecurityQuestions);
router.get('/audit', protect, getSecurityAuditLogs);
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);

module.exports = router;