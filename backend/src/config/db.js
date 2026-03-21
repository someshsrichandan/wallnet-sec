const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  const uri = env.mongodbUri;

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Set it in your .env file');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected (${env.nodeEnv})`);
};

module.exports = { connectDB };
