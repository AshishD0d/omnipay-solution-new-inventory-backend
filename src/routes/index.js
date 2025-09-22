const express = require('express');
const router = express.Router();

// Import all route modules here
const authRoutes = require('./authRoute');
const productRoutes = require('./productRoute');
const inventoryRoutes = require('./inventoryRoute');
const salesRoutes = require('./salesRoute');
const dashboardRoutes = require('./dashboardRoute');
const monthYearRoutes = require('./monthYearRoute');

// Use routes with appropriate base paths
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/monthYear', monthYearRoutes);

// Export the main router
module.exports = router;
