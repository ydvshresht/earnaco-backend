const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

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

    // 🛑 Simple daily limit (optional but recommended)
    const lastAd = user.lastAdWatchedAt;
    if (
      lastAd &&
      Date.now() - lastAd < 60 * 1000
    ) {
      return res
        .status(429)
        .json({ msg: "Please wait before watching another ad" });
    }

    user.coins += 1;
    user.lastAdWatchedAt = Date.now();
    await user.save();

   await Transaction.create({
  user: user._id,
  type: "credit",          // ✅ standard
  coins: 1,
  status: "success",       // ✅ explicit
  reason: "Watched ad"     // ✅ human readable
});


    res.json({ msg: "+1 coin added", coins: user.coins });
  } catch (err) {
    console.error("WATCH AD ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
