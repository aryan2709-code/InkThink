import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on("connected", () => console.log("Database Connected")) // mongoose.connection represents the active mongodb connection
    // .on("connected", callback) means: “When Mongoose successfully connects to MongoDB, run this callback.
    await mongoose.connect(`${process.env.MONGODB_URI}/inkthink`);
}

export default connectDB;