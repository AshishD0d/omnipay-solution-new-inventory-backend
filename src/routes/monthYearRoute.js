const exprees = require('express');
const router = exprees.Router();
const monthYearController = require('../controllers/monthYearController');
const { userAuth } = require('../middlewares/authMiddleware');

// GET /api/monthYear/months
router.get('/months', userAuth, monthYearController.allMonths);
// GET /api/monthYear/years
router.get('/years', userAuth, monthYearController.fetchYears);

module.exports = router;