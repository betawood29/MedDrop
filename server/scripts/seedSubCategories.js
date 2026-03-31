// Seed script — creates medicine subcategories
// Run: node scripts/seedSubCategories.js

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

const MEDICINE_SUBCATEGORIES = [
  { name: 'Health & Wellness Supplements', icon: '🌿', displayOrder: 1 },
  { name: 'Protein & Fitness', icon: '💪', displayOrder: 2 },
  { name: 'Antiseptic, Masks & Sanitizers', icon: '🧴', displayOrder: 3 },
  { name: 'Herbal Drinks', icon: '🍵', displayOrder: 4 },
  { name: 'Hangover Cures', icon: '🍺', displayOrder: 5 },
  { name: 'Prescription Medicines', icon: '💊', displayOrder: 6 },
  { name: 'OTC Medicines', icon: '🩹', displayOrder: 7 },
  { name: 'Feminine Care', icon: '🌸', displayOrder: 8 },
  { name: 'Sexual Wellness', icon: '❤️', displayOrder: 9 },
  { name: 'General Medical Supplies', icon: '🩺', displayOrder: 10 },
];

const seed = async () => {
  await connectDB();

  // Find the Medicines category
  const medicinesCat = await Category.findOne({
    slug: { $in: ['medicines', 'medicine'] },
    isActive: true,
  });

  if (!medicinesCat) {
    console.error('❌ "Medicines" category not found. Please create it first.');
    process.exit(1);
  }

  console.log(`✅ Found category: ${medicinesCat.name} (${medicinesCat._id})`);

  let created = 0;
  let skipped = 0;

  for (const sub of MEDICINE_SUBCATEGORIES) {
    const existing = await SubCategory.findOne({
      name: sub.name,
      parentCategory: medicinesCat._id,
    });

    if (existing) {
      console.log(`  ⏭  "${sub.name}" already exists — skipping`);
      skipped++;
      continue;
    }

    await SubCategory.create({
      ...sub,
      parentCategory: medicinesCat._id,
    });
    console.log(`  ✅ Created "${sub.name}"`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
