import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });

    console.log(`MongoDB Connected : ${conn.connection.host}`);
  } catch (error) {
    console.log("Error is Connecting to MongoDB", error.message);
    process.exit(1);
  }
};


