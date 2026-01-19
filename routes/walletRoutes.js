const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const router = express.Router();

/**
 * GET BALANCE
 */
router.get("/", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ balance: user.wallet });
  } catch (err) {
    next(err);
  }
});

/**
 * GET TRANSACTIONS
 */
router.get("/transactions", protect, async (req, res, next) => {
  try {
    const txns = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(txns);
  } catch (err) {
    next(err);
  }
});

/**
 * WITHDRAW REQUEST
 */
router.post("/withdraw", protect, async (req, res, next) => {
  try {
    const { amount } = req.body;

    const user = await User.findById(req.user.id);

    if (amount > user.wallet)
      return res.status(400).json({ msg: "Insufficient balance" });

    user.wallet -= amount;
    await user.save();

    await Transaction.create({
      user: user._id,
      amount,
      type: "withdraw"
    });

    res.json({ msg: "Withdraw request submitted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
