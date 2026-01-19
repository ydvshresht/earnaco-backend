const express = require("express");
const protect = require("../middleware/authMiddleware");
const razorpay = require("../config/razorpay");
const Transaction = require("../models/Transaction");

const router = express.Router();


router.post("/create-order", protect, async (req,res)=>{
 const { amount } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ msg: "Invalid amount" });
 const order = await razorpay.orders.create({
  amount: amount * 100,
  currency:"INR",
  receipt: "txn_"+Date.now()
 });

 await Transaction.create({
  user:req.user.id,
  amount,
  type:"deposit",
  status:"pending",
  razorpayOrderId:order.id
 });

 res.json(order);
});

module.exports = router;
