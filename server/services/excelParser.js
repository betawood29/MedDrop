// Excel parser service — parses .xlsx/.xls product upload files using SheetJS
// Validates rows, matches/creates categories, and upserts products

const XLSX = require('xlsx');
const fs = require('fs');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Parse an uploaded Excel file and return product data with validation
const parseProductExcel = async (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  // Clean up the temp file
  fs.unlinkSync(filePath);

  if (!rows.length) {
    return { added: 0, updated: 0, errors: [{ row: 0, reason: 'Excel file is empty' }] };
  }

  const results = { added: 0, updated: 0, errors: [] };

  // Cache categories to avoid repeated DB lookups
  const categoryCache = new Map();
  const existingCategories = await Category.find();
  existingCategories.forEach((cat) => {
    categoryCache.set(cat.name.toLowerCase(), cat);
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header)

    try {
      // Validate required fields
      if (!row.name || !row.price || !row.category) {
        results.errors.push({ row: rowNum, reason: 'Missing required fields (name, price, category)' });
        continue;
      }

      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) {
        results.errors.push({ row: rowNum, reason: `Invalid price: ${row.price}` });
        continue;
      }

      // Find or create category (case-insensitive match)
      const categoryName = String(row.category).trim();
      let category = categoryCache.get(categoryName.toLowerCase());

      if (!category) {
        category = await Category.create({ name: categoryName, slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
        categoryCache.set(categoryName.toLowerCase(), category);
      }

      // Build product data from row
      const productData = {
        name: String(row.name).trim(),
        description: row.description ? String(row.description).trim() : '',
        price,
        mrp: row.mrp ? parseFloat(row.mrp) : null,
        category: category._id,
        image: row.image ? String(row.image).trim() : '',
        inStock: row.inStock ? String(row.inStock).toLowerCase() !== 'no' : true,
        stockQty: row.stockQty ? parseInt(row.stockQty, 10) : 0,
        requiresPrescription: row.requiresPrescription ? String(row.requiresPrescription).toLowerCase() === 'yes' : false,
        tags: row.tags ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
        isActive: true,
      };

      // Upsert: update if exists (by name), create if not
      const existing = await Product.findOne({ name: productData.name });
      if (existing) {
        await Product.findByIdAndUpdate(existing._id, productData);
        results.updated++;
      } else {
        await Product.create(productData);
        results.added++;
      }
    } catch (error) {
      results.errors.push({ row: rowNum, reason: error.message });
    }
  }

  return results;
};

// Generate a sample Excel template for product uploads
const generateSampleExcel = () => {
  const sampleData = [
    { name: 'Dolo 650mg', description: 'Strip of 15 tablets', price: 30, mrp: 35, category: 'Medicines', image: 'https://example.com/dolo.jpg', inStock: 'Yes', stockQty: 100, requiresPrescription: 'No', tags: 'fever,pain relief' },
    { name: 'Lays Classic', description: '52g pack', price: 20, mrp: 20, category: 'Snacks', image: '', inStock: 'Yes', stockQty: 50, requiresPrescription: 'No', tags: 'chips,snack' },
    { name: 'Crocin Advance', description: 'Strip of 20 tablets', price: 25, mrp: 30, category: 'Medicines', image: 'https://example.com/crocin.jpg', inStock: 'Yes', stockQty: 80, requiresPrescription: 'No', tags: 'fever,headache' },
    { name: 'Notebook A4', description: '200 pages ruled', price: 45, mrp: 50, category: 'Stationery', image: '', inStock: 'Yes', stockQty: 30, requiresPrescription: 'No', tags: 'notebook,writing' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { parseProductExcel, generateSampleExcel };
