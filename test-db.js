const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.production' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('Testing MongoDB connection...');
console.log('Connection URI:', MONGODB_URI.replace(/:[^:@]{4}[^:@]*@/, ':***@')); // Mask password

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  mongoose.connection.close();
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});
