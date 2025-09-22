const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { userAuth } = require('../middlewares/authMiddleware');

// GET /api/sales/todayYesterdaySales
router.get('/todayYesterdaySales', userAuth, salesController.todayYesterdaySales);
// POST /api/sales/salesHistoryData
router.post('/salesHistoryData', userAuth, salesController.salesHistoryData);
// POST /api/sales/downloadReport
router.post('/downloadReport', userAuth, salesController.downloadReport);
// GET /api/sales/activeSales
router.get('/activeSales', userAuth, salesController.activeSales);
// POST /api/sales/flashReport
router.post('/flashReport', userAuth, salesController.flashReport);
// POST /api/sales/hourlyReport
router.post('/hourlyReport', userAuth, salesController.hourlyReport);


module.exports = router;