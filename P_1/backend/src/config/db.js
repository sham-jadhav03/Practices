import mongoose from "mongoose";
import { config } from "./config.js";

const connectDB = async () => {
  await mongoose.connect(config.MONGO_URI).then(() => {
    console.log("Connect to DB");
  });
};

export default connectDB;
