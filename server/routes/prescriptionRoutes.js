// Prescription routes — user upload & listing (protected by user auth)

const router = require('express').Router();
const protect = require('../middleware/auth');
const { prescriptionUpload } = require('../middleware/upload');
const {
  uploadPrescription,
  reuploadPrescription,
  getMyPrescriptions,
  getPrescription,
  deletePrescription,
  requestDelivery,
} = require('../controllers/prescriptionController');

router.use(protect);

router.post('/',    prescriptionUpload.single('prescription'), uploadPrescription);
router.get('/',     getMyPrescriptions);
router.get('/:id',  getPrescription);
router.delete('/:id', deletePrescription);
router.patch('/:id/reupload', prescriptionUpload.single('prescription'), reuploadPrescription);
router.post('/:id/request-delivery', requestDelivery);  // legacy

module.exports = router;
