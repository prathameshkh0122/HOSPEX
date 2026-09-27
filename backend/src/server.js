require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/db');
const seedResources = require('./seed/seedResources');
const seedAdmin = require('./seed/seedAdmin');

async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set to a random value with at least 32 characters.');
  await connectDatabase();
  await seedResources();
  await seedAdmin();
  const port = Number(process.env.PORT) || 5000;
  const server = app.listen(port, () => console.log(`HOSPEX API ready at http://localhost:${port}`));
  const shutdown = () => server.close(async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    process.exit(0);
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => { console.error('Could not start HOSPEX API:', error.message); process.exit(1); });
