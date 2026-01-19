const express = require("express");
const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const router = express.Router();

router.post("/razorpay", async (req,res)=>{
 const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

 const shasum = crypto.createHmac("sha256", secret);
 shasum.update(JSON.stringify(req.body));
 const digest = shasum.digest("hex");

 if(digest !== req.headers["x-razorpay-signature"])
  return res.status(400).send("Invalid");

 const event = req.body.event;

 if(event==="payment.captured"){
  const pay = req.body.payload.payment.entity;

  const tx = await Transaction.findOne({
   razorpayOrderId: pay.order_id
  });

  if(tx && tx.status!=="success"){
   tx.status="success";
   tx.razorpayPaymentId=pay.id;
   await tx.save();

   await User.findByIdAndUpdate(tx.user,{
    $inc:{ wallet: tx.amount }
   });
  }
 }

 res.json({ok:true});
});


module.exports = router;
