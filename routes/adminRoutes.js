const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Contest = require("../models/Contest");
const Transaction = require("../models/Transaction");
const FraudLog = require("../models/FraudLog");
/* ====================
   ADMIN STATS
==================== */

router.get("/stats", protect, adminOnly, async (req,res)=>{
 const totalUsers = await User.countDocuments();

 const today = new Date();
 today.setHours(0,0,0,0);

 const todayUsers = await User.countDocuments({
  createdAt: { $gte: today }
 });

 const deposits = await Transaction.aggregate([
  { $match:{ type:"deposit", status:"success" }},
  { $group:{ _id:null, total:{ $sum:"$amount" }}}
 ]);

 const withdrawals = await Transaction.aggregate([
  { $match:{ type:"withdraw", status:"success" }},
  { $group:{ _id:null, total:{ $sum:"$amount" }}}
 ]);

 const frauds = await FraudLog.countDocuments();
const questions = await Question.countDocuments();
 const contests = await Contest.countDocuments();

 const depositTotal = deposits[0]?.total || 0;
 const withdrawTotal = withdrawals[0]?.total || 0;

 const profit = depositTotal - withdrawTotal;

 res.json({
  totalUsers,
  questions,
  todayUsers,
  depositTotal,
  withdrawTotal,
  profit,
  frauds,
  contests
 });
});

/**
 * ➕ ADD QUESTION
 */
router.post("/add-question", protect, adminOnly, async (req, res, next) => {
  try {
    const { question, options, correctAnswer, difficulty } = req.body;

    if (!question || options.length !== 4) {
      return res.status(400).json({ msg: "Invalid data" });
    }

    const q = await Question.create({
      question,
      options,
      correctAnswer,
      difficulty
    });

    res.json({ msg: "Question added", question: q });
  } catch (err) {
     next(err);
  }
});

/**
 * 📋 GET ALL QUESTIONS
 */
router.get("/questions", protect, adminOnly, async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  res.json(questions);
});
// ❌ DELETE QUESTION
router.delete("/delete-question/:id", protect, adminOnly, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ msg: "Question deleted" });
});



/* =====================
   GET ALL FRAUD LOGS
===================== */
router.get("/fraud", protect, adminOnly, async (req, res) => {
  const logs = await FraudLog
    .find()
    .populate("user", "email userId")
    .sort({ createdAt: -1 });

  res.json(logs);
});

/* =====================
   BLOCK USER
===================== */
router.post("/block/:id", protect, adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    blocked: true
  });

  res.json({ msg: "User blocked" });
});

/* =====================
   UNBLOCK USER
===================== */
router.post("/unblock/:id", protect, adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, {
    blocked: false
  });

  res.json({ msg: "User unblocked" });
});


module.exports = router;
