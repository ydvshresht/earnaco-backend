const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const User = require("../models/User");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Result = require("../models/Result");

/* =====================
   ADMIN ANALYTICS
===================== */

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTests = await Test.countDocuments();
    const totalContests = await Contest.countDocuments();
    const totalAttempts = await Result.countDocuments();

    // 💰 Total distributed prize
    const users = await User.find();
    const totalWallet = users.reduce(
      (sum, u) => sum + (u.wallet || 0),
      0
    );

    // 🏆 Top winners
    const topWinners = await User.find()
      .sort({ wallet: -1 })
      .limit(5)
      .select("fullName wallet");

    res.json({
      totalUsers,
      totalTests,
      totalContests,
      totalAttempts,
      totalWallet,
      topWinners
    });

  } catch (err) {
    console.error("ANALYTICS ERROR 👉", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
