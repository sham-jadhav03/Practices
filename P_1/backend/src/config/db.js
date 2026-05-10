import mongoose from "mongoose";
import { config } from "./config.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI).then(() => {
      console.log("Connected to DB");
    });
  } catch (err) {
    console.log(err);
  }
};

export default connectDB;
