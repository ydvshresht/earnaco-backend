const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const CoinTransaction = require("../models/CoinTransaction");

/* ===============================
   GET USER COIN TRANSACTIONS
=============================== */
router.get("/", protect, async (req, res) => {
  try {
    const transactions = await CoinTransaction.find({
      user: req.user.id
    })
      .select("type coins status reason createdAt")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);
  } catch (err) {
    console.error("TRANSACTION FETCH ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
