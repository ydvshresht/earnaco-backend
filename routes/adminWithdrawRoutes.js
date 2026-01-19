const express = require("express");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const axios = require("axios");
const router = express.Router();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ======================
   GET PENDING WITHDRAWS
====================== */
router.get("/withdraw-requests", protect, adminOnly, async (req, res) => {
  const list = await Transaction.find({
    type: "withdraw",
    status: "pending"
  }).populate("user", "fullName email");

  res.json(list);
});


//* ======================
  

router.post("/approve/:id", protect, adminOnly, async (req,res)=>{
 try{
  const tx = await Transaction.findById(req.params.id);

  const response = await axios.post(
   "https://api.razorpay.com/v1/payouts",
   {
    account_number: process.env.COMPANY_ACCOUNT,
    fund_account_id: tx.fundAccount,
    amount: tx.amount * 100,
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    queue_if_low_balance: true
   },
   {
    auth:{
     username: process.env.RAZORPAY_KEY_ID,
     password: process.env.RAZORPAY_KEY_SECRET
    }
   }
  );

  tx.status="approved";
  await tx.save();

  res.json({msg:"Payout success", data: response.data});

 }catch(err){
  console.log("RAZORPAY ERROR:", err.response?.data || err.message);
  res.status(500).json({
   msg:"Payout failed",
   error: err.response?.data || err.message
  });
 }
});


router.post("/reject/:id", protect, adminOnly, async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx || tx.status !== "pending")
    return res.status(400).json({ msg: "Invalid request" });

  tx.status = "failed";
  await tx.save();

  const user = await User.findById(tx.user);
  user.wallet += tx.amount;
  user.locked -= tx.amount;
  await user.save();

  res.json({ msg: "Withdraw rejected & refunded" });
});




module.exports = router;
