const express = require("express");
const protect = require("../middleware/authMiddleware");
const Bank = require("../models/Bank");

const router = express.Router();

/**
 * 🏦 GET USER BANKS
 */
router.get("/", protect, async (req, res) => {
  const banks = await Bank.find({ user: req.user.id });
  res.json(banks);
});

/**
 * ➕ ADD BANK
 */
router.post("/add", protect, async (req, res) => {
  const { bankName, accountNumber, ifsc } = req.body;

  if (!bankName || !accountNumber || !ifsc) {
    return res.status(400).json({ msg: "All fields required" });
  }

  const existingPrimary = await Bank.findOne({
    user: req.user.id,
    isPrimary: true
  });

  const bank = await Bank.create({
    user: req.user.id,
    bankName,
    accountNumber,
    ifsc,
    isPrimary: !existingPrimary // first bank becomes primary
  });

  res.json({ msg: "Bank added", bank });
});

/**
 * ⭐ SET PRIMARY BANK
 */
router.put("/primary/:bankId", protect, async (req, res) => {
  await Bank.updateMany(
    { user: req.user.id },
    { isPrimary: false }
  );

  await Bank.findByIdAndUpdate(req.params.bankId, {
    isPrimary: true
  });

  res.json({ msg: "Primary bank updated" });
});

module.exports = router;
