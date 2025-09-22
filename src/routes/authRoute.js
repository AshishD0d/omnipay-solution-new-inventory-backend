const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { userAuth } = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', authController.login);
// GET /api/auth/profile
router.get('/profile', userAuth, authController.getUserProfile);

module.exports = router;
