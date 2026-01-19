const mongoose = require("mongoose");

const fraudSchema = new mongoose.Schema({
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  reason:String,
  severity:{
    type:String,
    enum:["low","medium","high"]
  },
  ip:String,
  device:String,
  action:{
    type:String,
    enum:["warned","blocked","review"]
  }
},{timestamps:true});

module.exports = mongoose.model("FraudLog",fraudSchema);
