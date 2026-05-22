import mongoose from "mongoose";

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}
