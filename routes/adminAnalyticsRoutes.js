const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const User = require("../models/User");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Result = require("../models/Result");
const Payment = require("../models/Payment"); // 👈 Razorpay payments

/* =====================
   ADMIN STATS
===================== */
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    /* USERS */
    const totalUsers = await User.countDocuments();

    const todayUsers = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    /* CONTENT */
    const totalTests = await Test.countDocuments();
    const totalContests = await Contest.countDocuments();
    const totalAttempts = await Result.countDocuments();

    /* 🪙 COINS */
    const users = await User.find({}, "coins");
    const totalCoins = users.reduce(
      (sum, u) => sum + (u.coins || 0),
      0
    );

    /* 🥇 TOP USERS BY COINS */
    const topUsers = await User.find()
      .sort({ coins: -1 })
      .limit(5)
      .select("fullName userId coins");

    /* 💰 COMPANY PROFIT (REAL MONEY) */
    const payments = await Payment.find({ status: "success" });
    const profit = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    res.json({
      totalUsers,
      todayUsers,
      totalTests,
      totalContests,
      totalAttempts,
      totalCoins,
      profit,
      topUsers
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
