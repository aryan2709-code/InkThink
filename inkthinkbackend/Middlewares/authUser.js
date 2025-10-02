import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authUser = async (req,res,next) => {
    try {
         const {token} = req.headers;
         if(!token)
         {
            return res.json({
                success : false,
                message : "Not authorized, try again"
            })
         }
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         req.user = await userModel.findById(decoded.id).select("-password");
         next();


    } catch (error) {
        console.log(error);
        return res.json({
            success : false,
            message : "Unauthorized access"
        })
    }
}

export default authUser;