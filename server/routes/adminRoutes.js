// Admin routes — dashboard, order management, product CRUD, category CRUD, subcategory CRUD
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
  uploadProductImage,
  uploadCategoryImage,
  getAdminSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} = require('../controllers/adminController');
const { uploadExcel, downloadTemplate } = require('../controllers/uploadController');
const { getCategories } = require('../controllers/productController');
const { getBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage } = require('../controllers/bannerController');

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

// Category image upload
router.post('/categories/upload-image', imageUpload.single('image'), uploadCategoryImage);

// SubCategory management
router.get('/subcategories', getAdminSubCategories);
router.post('/subcategories', createSubCategory);
router.put('/subcategories/:id', updateSubCategory);
router.delete('/subcategories/:id', deleteSubCategory);
// Subcategory image upload (reuses same Cloudinary uploader as categories)
router.post('/subcategories/upload-image', imageUpload.single('image'), uploadCategoryImage);

// Banner management
router.get('/banner', getBanners);
router.post('/banner', createBanner);
router.put('/banner/:id', updateBanner);
router.delete('/banner/:id', deleteBanner);
router.post('/banner/upload-image', imageUpload.single('image'), uploadBannerImage);

module.exports = router;
