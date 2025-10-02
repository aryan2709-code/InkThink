import mongoose, { Schema } from "mongoose";

const userSchema = new Schema( {
username: {type:String, required : true, unique: true, trim: true},
email : {type: String, required: true, unique: true},
password : {type: String, required: true},
currentRoom : {type:String, default: null}
}, {timestamps:true} );

const userModel = mongoose.models.user || mongoose.model("user",userSchema); // Avoid multiple models
export default userModel;