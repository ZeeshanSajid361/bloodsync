require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models/User');
const { DonorProfile } = require('../models/DonorProfile');
const { Organization } = require('../models/Organization');
const { Request } = require('../models/Request');

const emailsToDelete = ['zeeshansajid361@gmail.com', 'i230779@isb.nu.edu.pk'];

async function deleteUsers() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('[Error] MONGO_URI missing in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Info] Connected to MongoDB...');

    for (const email of emailsToDelete) {
      const cleanEmail = email.toLowerCase().trim();
      const users = await User.find({ email: cleanEmail });

      if (users.length === 0) {
        console.log(`[Skip] No user found for: ${cleanEmail}`);
        continue;
      }

      for (const u of users) {
        // Prevent deleting admin unless explicitly forced
        if (u.role === 'admin') {
          console.log(`[Skip] Account ${cleanEmail} is an Admin. Keeping admin.`);
          continue;
        }

        await DonorProfile.deleteMany({ user: u._id });
        await Organization.deleteMany({ owner: u._id });
        await Request.deleteMany({ requester: u._id });
        await User.deleteOne({ _id: u._id });
        console.log(`[Success] Deleted account: ${cleanEmail} (ID: ${u._id})`);
      }
    }

    console.log('[Done] Cleanup completed.');
    process.exit(0);
  } catch (err) {
    console.error('[Error]', err);
    process.exit(1);
  }
}

deleteUsers();
