const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Transaction = require("../models/Transaction");

router.get("/", protect, async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
  next(err);
}

});

module.exports = router;
