// Admin routes — dashboard, order management, product CRUD, category CRUD
// All routes (except login) require admin authentication
const router = require('express').Router();
const adminAuth = require('../middleware/admin');
const { excelUpload, imageUpload } = require('../middleware/upload');
const { adminLoginLimiter } = require('../middleware/rateLimiter');
const {
  adminLogin,
  getDashboard,
  getAdminOrders,
  updateOrderStatus,
  getAdminProducts,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/adminController');
const { uploadExcel, downloadTemplate } = require('../controllers/uploadController');
const { getCategories } = require('../controllers/productController');

// Admin login (no auth needed, rate limited)
router.post('/login', adminLoginLimiter, adminLogin);

// All routes below require admin auth
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboard);

// Order management
router.get('/orders', getAdminOrders);
router.patch('/orders/:id', updateOrderStatus);

// Excel upload (must be BEFORE /:id routes to avoid "upload-excel" matching as :id)
router.post('/products/upload-excel', excelUpload.single('file'), uploadExcel);
router.get('/products/download-template', downloadTemplate);

// Product image upload
const { uploadProductImage } = require('../controllers/adminController');
router.post('/products/upload-image', imageUpload.single('image'), uploadProductImage);

// Product management
router.get('/products', getAdminProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id', patchProduct);
router.delete('/products/:id', deleteProduct);

// Category management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Category image upload (reuses same Cloudinary uploader)
const { uploadCategoryImage } = require('../controllers/adminController');
router.post('/categories/upload-image', imageUpload.single('image'), uploadCategoryImage);

module.exports = router;
