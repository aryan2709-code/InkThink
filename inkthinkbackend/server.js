import express from "express";
import "dotenv/config"
import cors from "cors";
import connectDB from "./config/mongoDB.js";
import userRouter from "./routes/userRoute.js";
import {createServer} from "http";
import { initSocketIO } from "./socket/index.js";

//app config
const app = express();
const port = process.env.PORT || 4000;
connectDB();

// middlewares
app.use(cors());
app.use(express.json());

// API endpoints
app.use("/api/user", userRouter);



// Sample end point
app.get("/" , (req,res) => {
    res.send("API is working nicely at the moment");
})

// Create a raw http server and attaching the express application to it
const httpServer = createServer(app); 
// Initialise the socket.io connection
initSocketIO(httpServer);

// Start Sever
httpServer.listen(port,() => {
console.log("Server Started at port ",port);
});