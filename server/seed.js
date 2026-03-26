// Seed script — creates initial admin account and sample categories
// Run once: node seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Category = require('./models/Category');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin account (phone from .env ADMIN_PHONE)
    const existingAdmin = await Admin.findOne({ phone: process.env.ADMIN_PHONE });
    if (!existingAdmin) {
      await Admin.create({
        name: 'MedDrop Admin',
        phone: process.env.ADMIN_PHONE,
        password: 'admin123', // Change this in production!
      });
      console.log(`Admin created — Phone: ${process.env.ADMIN_PHONE}, Password: admin123`);
    } else {
      console.log('Admin already exists');
    }

    // Seed default categories
    const categories = [
      { name: 'Medicines', icon: '💊', displayOrder: 1 },
      { name: 'Snacks', icon: '🍿', displayOrder: 2 },
      { name: 'Personal Care', icon: '🧴', displayOrder: 3 },
      { name: 'Beverages', icon: '🥤', displayOrder: 4 },
      { name: 'Stationery', icon: '📝', displayOrder: 5 },
      { name: 'Essentials', icon: '🏠', displayOrder: 6 },
    ];

    for (const cat of categories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create(cat);
        console.log(`Category created: ${cat.icon} ${cat.name}`);
      }
    }

    console.log('\nSeed complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedData();
