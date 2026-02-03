const express = require("express");
const crypto = require("crypto");
const protect = require("../middleware/authMiddleware");
const razorpay = require("../config/razorpay");

const Transaction = require("../models/Transaction");
const CoinTransaction = require("../models/CoinTransaction");
const User = require("../models/User");

const router = express.Router();

/* =========================
   COIN PRICE MAP
========================= */
const COIN_PRICES = {
  50: 29,
  120: 59,
  250: 99
};

/* =========================
   CREATE COIN ORDER
========================= */

router.post("/buy-coins", protect, async (req, res) => {
  try {
    const { coins } = req.body;

    if (!COIN_PRICES[coins]) {
      return res.status(400).json({ msg: "Invalid coin pack" });
    }

    const amount = COIN_PRICES[coins] * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `coin_${Date.now()}`
    });

    await Transaction.create({
  user: req.user.id,        // ✅ FIXED
  type: "buy_coins",
  razorpayOrderId: order.id,
  amount,
  coins,
  status: "pending"
});


    res.json({
      orderId: order.id,
      amount,
      coins
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Payment init failed" });
  }
});



/* =========================
   VERIFY COIN PAYMENT
========================= */
router.post("/verify-coin-payment", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // 🔐 verify signature
    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(
        razorpay_order_id + "|" + razorpay_payment_id
      )
      .digest("hex");

    if (sign !== razorpay_signature)
      return res.status(400).json({ msg: "Invalid signature" });

    const txn = await Transaction.findOne({
      razorpayOrderId: razorpay_order_id,
      status: "pending"
    });

    if (!txn)
      return res.status(400).json({ msg: "Transaction not found" });

    // 🪙 credit coins
    const user = await User.findById(txn.user);
    user.coins += txn.coins;
    await user.save();

    // update transaction
    txn.status = "success";
    txn.razorpayPaymentId = razorpay_payment_id;
    await txn.save();

    // log coin transaction
    await CoinTransaction.create({
      user: user._id,
      coins: txn.coins,
      type: "credit",
      reason: "Coin purchase"
    });

    res.json({ msg: "Coins added successfully" });
  } catch (err) {
    console.error("VERIFY COIN ERROR:", err);
    res.status(500).json({ msg: "Payment verification failed" });
  }
});

module.exports = router;
