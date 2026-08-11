require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models/User');

async function createAdmin() {
  try {
    const email = process.argv[2] || 'admin@bloodsync.com';
    const password = process.argv[3] || 'Password123!';

    if (!process.env.MONGO_URI) {
      console.error('[Error] MONGO_URI is missing in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'admin';
      user.isEmailVerified = true;
      await user.save();
      console.log(`[Success] User ${email} has been promoted to Admin and verified!`);
    } else {
      await User.create({
        name: 'System Admin',
        email,
        password,
        role: 'admin',
        city: 'System',
        phone: '00000000000',
        isEmailVerified: true
      });
      console.log(`[Success] New Admin account created!`);
      console.log(`Email:    ${email}`);
      console.log(`Password: ${password}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[Error]', error.message);
    process.exit(1);
  }
}

createAdmin();
