require("dotenv").config();
const mongoose = require("mongoose");


const connectDB = async () => {
  try {
    
    const uri = process.env.MONGO_URI;
    await mongoose
      .connect(uri, {
        bufferCommands: false,
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
      })
      .catch((error) => console.log(error));
    const connection = await mongoose.connection;
    console.log("MONGODB CONNECTED SUCCESSFULLY!");
  } catch (error) {
    console.log(error);
    return error;
  }
};


module.exports = connectDB;
