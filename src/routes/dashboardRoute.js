const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { userAuth } = require('../middlewares/authMiddleware');

// GET /api/dashboard/live-sales-trend
router.get('/live-sales-trend', userAuth, dashboardController.liveSalesTrend);
// GET /api/dashboard/top-selling-items-today
router.get('/top-selling-items-today', userAuth, dashboardController.topSellingItemsToday);

module.exports = router;