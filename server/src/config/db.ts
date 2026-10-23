import mongoose from "mongoose"


const connectDB = async () => {
   const mongoUrl = process.env.MONGO_URI
   if (!mongoUrl) {
      throw new Error("MONGO_URI environment variable is not set")
   }

   await mongoose.connect(mongoUrl)
   console.log("Connect to database.")
}

export default connectDB;