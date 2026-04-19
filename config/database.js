import mongoose from 'mongoose';

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required in the backend .env file');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    throw new Error(`Unable to connect to MongoDB at ${mongoUri}. Start MongoDB locally or update MONGODB_URI. Original error: ${error.message}`);
  }
};
