const mongoose = require('mongoose');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
