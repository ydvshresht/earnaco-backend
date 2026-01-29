const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const User = require("../models/User");
const Contest = require("../models/Contest");
const Question = require("../models/Question");
const FraudLog = require("../models/FraudLog");
const CoinTransaction = require("../models/CoinTransaction");
const Payment = require("../models/Payment");

/* ====================
   ADMIN STATS (COINS + ₹)
==================== */
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    /* 👥 USERS */
    const totalUsers = await User.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsers = await User.countDocuments({
      createdAt: { $gte: today }
    });

    /* ❓ QUESTIONS & CONTESTS */
    const questions = await Question.countDocuments();
    const contests = await Contest.countDocuments();

    /* 🚨 FRAUD */
    const frauds = await FraudLog.countDocuments();

    /* 🪙 COINS */
    const coinCredits = await CoinTransaction.aggregate([
      { $match: { type: "credit" } },
      { $group: { _id: null, total: { $sum: "$coins" } } }
    ]);

    const coinDebits = await CoinTransaction.aggregate([
      { $match: { type: "debit" } },
      { $group: { _id: null, total: { $sum: "$coins" } } }
    ]);

    const totalCoinsIssued = coinCredits[0]?.total || 0;
    const totalCoinsUsed = coinDebits[0]?.total || 0;

    /* 💰 REAL MONEY (ADMIN ONLY) */
    const payments = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const profit = payments[0]?.total || 0;

    res.json({
      totalUsers,
      todayUsers,
      questions,
      contests,
      frauds,
      totalCoinsIssued,
      totalCoinsUsed,
      profit
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* =====================
   ADD QUESTION
===================== */
router.post("/add-question", protect, adminOnly, async (req, res) => {
  const { question, options, correctAnswer, difficulty } = req.body;

  if (!question || !options || options.length !== 4) {
    return res.status(400).json({ msg: "Invalid data" });
  }

  const q = await Question.create({
    question,
    options,
    correctAnswer,
    difficulty
  });

  res.json({ msg: "Question added", question: q });
});

/* =====================
   GET QUESTIONS
===================== */
router.get("/questions", protect, adminOnly, async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  res.json(questions);
});

/* =====================
   DELETE QUESTION
===================== */
router.delete("/delete-question/:id", protect, adminOnly, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ msg: "Question deleted" });
});

/* =====================
   FRAUD LOGS
===================== */
router.get("/fraud", protect, adminOnly, async (req, res) => {
  const logs = await FraudLog.find()
    .populate("user", "email userId")
    .sort({ createdAt: -1 });

  res.json(logs);
});

/* =====================
   BLOCK USER
===================== */
router.post("/block/:id", protect, adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { blocked: true });
  res.json({ msg: "User blocked" });
});

/* =====================
   UNBLOCK USER
===================== */
router.post("/unblock/:id", protect, adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { blocked: false });
  res.json({ msg: "User unblocked" });
});

module.exports = router;
