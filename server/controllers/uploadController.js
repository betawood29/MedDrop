// Upload controller — handles Excel product uploads and sample template download

const { parseProductExcel, generateSampleExcel } = require('../services/excelParser');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// POST /api/admin/products/upload-excel — upload and parse product Excel file
const uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('Please upload an Excel file (.xlsx or .xls)');

    const results = await parseProductExcel(req.file.path);

    ApiResponse.success(res, results, `Import complete: ${results.added} added, ${results.updated} updated, ${results.errors.length} errors`);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/products/download-template — download sample product Excel template
const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = generateSampleExcel();

    res.setHeader('Content-Disposition', 'attachment; filename=meddrop-product-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadExcel, downloadTemplate };
