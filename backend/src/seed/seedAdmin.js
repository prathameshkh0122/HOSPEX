const User = require('../models/User');

// Ensures a single admin account exists, sourced from environment variables.
// Never hardcodes credentials in source; if the admin already exists its
// password is left untouched (change it via the database, not this script).
module.exports = async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    return;
  }
  await User.create({
    email: email.toLowerCase().trim(),
    password,
    role: 'admin'
  });
  console.log(`Seeded admin account for ${email}`);
};
