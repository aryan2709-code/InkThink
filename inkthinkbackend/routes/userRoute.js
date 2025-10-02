
// All the user related routes will be here
// Sign In , Sign Up

import express from "express";
import { registerUser,loginUser,getProfile } from "../controllers/userController.js";
import authUser from "../Middlewares/authUser.js";
const userRouter = express.Router();

// End-points
userRouter.post("/register",registerUser);
userRouter.post("/login",loginUser);
userRouter.get("/get-profile",authUser,getProfile);


export default userRouter;