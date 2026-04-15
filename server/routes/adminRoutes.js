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
  getAdminCategories,
  toggleCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadProductImage,
  uploadCategoryImage,
  getAdminSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getAdminPrintOrders,
  updatePrintOrderStatus,
} = require('../controllers/adminController');
const { getAdminPrescriptions, reviewPrescription, updateDeliveryStatus } = require('../controllers/prescriptionController');
const { uploadExcel, downloadTemplate } = require('../controllers/uploadController');
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

// Category management (admin sees ALL including inactive)
router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id/toggle', toggleCategory);
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

// Print order management
router.get('/print-orders', getAdminPrintOrders);
router.patch('/print-orders/:id', updatePrintOrderStatus);

// Prescription management
router.get('/prescriptions', getAdminPrescriptions);
router.patch('/prescriptions/:id', reviewPrescription);
router.patch('/prescriptions/:id/delivery', updateDeliveryStatus);

module.exports = router;
