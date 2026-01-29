const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Transaction = require("../models/Transaction");

/* ===============================
   GET USER TRANSACTIONS
   (Coins + Money if needed)
=============================== */
router.get("/", protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.id
    })
      .select(
        "type amount coins status reason createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);
  } catch (err) {
    console.error("TRANSACTION FETCH ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
