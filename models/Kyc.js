const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
 pan:String,
 aadhaar:String,
 selfie:String,
 status:{enum:["pending","approved","rejected"],type:String,default:"pending"}
},{timestamps:true});

module.exports = mongoose.model("Kyc", kycSchema);
