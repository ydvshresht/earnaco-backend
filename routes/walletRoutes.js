const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const CoinTransaction = require("../models/CoinTransaction");
const router = express.Router();

/* ===============================
   GET COIN BALANCE
=============================== */
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("coins");
    res.json({ coins: user.coins });
  } catch (err) {
    console.error("WALLET ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===============================
   WATCH AD → +1 COIN
=============================== */
router.post("/watch-ad", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const now = new Date();

    if (user.lastAdWatchedAt) {
      const last = new Date(user.lastAdWatchedAt);

      const isSameDay =
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();
if (isSameDay) {
  return res.status(429).json({
    msg: "You can watch only 1 ad per day",
    coins: user.coins // 🔥 send current balance
  });
}

    }

    // ✅ Give coin
    user.coins += 1;
    user.lastAdWatchedAt = now;
    await user.save();

    await CoinTransaction.create({
      user: user._id,
      type: "credit",
      coins: 1,
      status: "success",
      reason: "Watched ad"
    });

    res.json({
      msg: "+1 coin added",
      coins: user.coins
    });
  } catch (err) {
    console.error("WATCH AD ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;
