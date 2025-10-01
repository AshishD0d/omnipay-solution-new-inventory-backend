const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { userAuth } = require('../middlewares/authMiddleware');

// GET /api/inventory/lowStockAlert
router.get('/lowStockAlert', userAuth, inventoryController.lowStockAlert);
// GET /api/inventory/dropedItems
router.get('/dropedItems', userAuth, inventoryController.dropedItems);
// GET /api/inventory/totalCount
router.get('/totalCount', userAuth, inventoryController.totalInventory);
// POST /api/inventory/inventoryTracking
router.post('/inventoryTracking', userAuth, inventoryController.inventoryTracking);
// POST /api/inventory/voidInvoice
router.post('/voidInvoice', userAuth, inventoryController.voideInvoice);

module.exports = router;