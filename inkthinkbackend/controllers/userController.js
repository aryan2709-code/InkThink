// End - points written for sign up, sign in and getting user profile

import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

// API for user sign up (first time )
const registerUser = async (req,res) => {
try {
    const {username, email, password} = req.body;
    // Checking missing entries
    if(!username || !email || !password) {
        return res.json({
            success : false,
            message : "Missing details"
        })
    }

    // Validating the email format
    if(!validator.isEmail(email))
    {
        return res.json({
            success : false,
            message : "The Email address is invalid"
        })
    }

    // Password strength filter
    if(password.length < 8)
    {
        return res.json({
            success : false,
            message : "The password should contain atleast 8 characters"
        })
    }

    // Hashing the user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);

    const userData = {
        username,
        email,
        password : hashedPassword
    }

    const newUser = new userModel(userData);
    const user = await newUser.save();
    // This user will have _id field
    const token = jwt.sign({
        id : user._id
    }, process.env.JWT_SECRET);

   res.json({
    success: true,
    token : token
   });
} catch (error) {
    console.log(error);
    res.json({
        success:false,
        message:error.message
    })
}
}

// API for user login
const loginUser = async (req,res) => {

    try
    {
    const {email,password} = req.body;
    if(!email || !password)
    {
        return res.json({
            success : false,
            message : "One of the fields is missing"
        })
    }

    // Check whether this email even exists in the database records
    const user = await userModel.findOne({email:email});
    if(!user)
    {
        return res.json({
            success : false,
            message : "No such user exists!"
        })
    }

    const isMatch = await bcrypt.compare(password,user.password);
    if(isMatch)
    {
        const token = jwt.sign({id : user._id}, process.env.JWT_SECRET);
        res.json({success: true, token:token});
    }
    else
    {
       res.json({
        success : false,
        message : "Invalid Credentials"
       })
    }
    } 
    catch (error) {
        console.log(error);
        res.json({
            success : false,
            message : error.message
        })
    }
}

// API for getting user details 
const getProfile = async (req,res) => {
    try {
        const userData = req.user;
        res.json({success:true, userData:userData})
    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message})
    }
}

export {registerUser,loginUser,getProfile};
