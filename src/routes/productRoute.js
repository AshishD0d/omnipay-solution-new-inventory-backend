const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { userAuth } = require('../middlewares/authMiddleware');
const { validateProduct } = require('../middlewares/productMiddleware');
const { upload } = require('../middlewares/upload');

// GET /api/products/getAll
router.get('/getAll', userAuth, productController.getAllProducts);
// POST /api/products/insert
router.post('/insert', userAuth, upload.single("image"), validateProduct, productController.insertProduct);
// PUT /api/products/update
router.put('/update', userAuth, upload.single("image"), productController.updateProduct);
// GET /api/products/categories
router.get('/categories', userAuth, productController.allCategories);
// POST /api/products/category-products
router.post('/category-products', userAuth, productController.categoriesWiseProducts);
// POST /api/products/getProductById
router.post('/getProductById', userAuth, productController.getProductById);
// POST /api/products/delete
router.post('/delete', userAuth, productController.deleteProduct);
// GET /api/products/productNameandID
router.get('/productNameandID', userAuth, productController.productNameandID);

module.exports = router;