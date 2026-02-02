const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const Result = require("../models/Result");
const Test = require("../models/Test");
const Contest = require("../models/Contest");
const User = require("../models/User");
const { isLeaderboardOpen } = require("../utils/timeWindow");

/* ===============================
   SUBMIT TEST RESULT
=============================== */
router.post("/submit", protect, async (req, res) => {
  try {
    const { testId, contestId, answers = [], timeTaken } = req.body;

    // 🔒 Already attempted (PER CONTEST)
    const alreadyAttempted = await Result.findOne({
      user: req.user.id,
      contest: contestId
    });

    if (alreadyAttempted) {
      return res.status(400).json({ msg: "Test already attempted" });
    }

    // 📄 Validate test
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    // 🏁 Validate contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    if (contest.status !== "live") {
      return res.status(403).json({ msg: "Contest not live" });
    }

    // 🧮 Score calculation
    let score = 0;

    const detailedAnswers = test.questions.map((q, index) => {
      const userAnswerIndex = answers[index];

      const isCorrect = userAnswerIndex === q.correctAnswer;
      if (isCorrect) score++;

      return {
        question: q.question,
        correctAnswer: q.options[q.correctAnswer],
        userAnswer:
          userAnswerIndex !== undefined
            ? q.options[userAnswerIndex]
            : "Not Attempted",
        status: isCorrect ? "Right" : "Wrong"
      };
    });

    // 🧾 Save result
    const result = await Result.create({
      user: req.user.id,
      test: testId,
      contest: contestId,
      score,
      totalQuestions: test.questions.length,
      answers: detailedAnswers,
      timeTaken
    });

    res.json({
      msg: "Result submitted successfully",
      score,
      totalQuestions: test.questions.length,
      resultId: result._id
    });
  } catch (err) {
    console.error("SUBMIT RESULT ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


/* ===============================
   MY TEST RESULTS
=============================== */
router.get("/my-tests", protect, async (req, res) => {
  try {
    const results = await Result.find({ user: req.user.id })
      .populate("test", "testName")
      .sort({ createdAt: -1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});
/* ===============================
   MY TEST RESULTS (CONTEST WISE)
=============================== */
const mongoose = require("mongoose");

router.get("/my-tests/:contestId", protect, async (req, res) => {
  try {
    const { contestId } = req.params;

    // 🛑 validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        msg: "Invalid contest ID"
      });
    }

    const results = await Result.find({
      user: req.user.id,
      contest: contestId
    })
      .populate("test", "testName")
      .sort({ createdAt: -1 });

    res.json(results);
  } catch (err) {
    console.error("MY TEST (CONTEST) ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


/* ===============================
   LEADERBOARD
=============================== */
router.get("/leaderboard/:testId", protect, async (req, res) => {
  try {
    if (!isLeaderboardOpen()) {
      return res.status(403).json({
        msg: "Leaderboard opens at 7 PM"
      });
    }

    const leaderboard = await Result.find({
      test: req.params.testId
    })
      .populate("user", "fullName userId")
      .sort({ score: -1, timeTaken: 1 })
      .limit(10);

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===============================
   ADMIN ANALYTICS (TEST)
=============================== */
router.get("/analytics/:testId", protect, adminOnly, async (req, res) => {
  try {
    const results = await Result.find({ test: req.params.testId });

    const totalAttempts = results.length;
    const averageScore =
      totalAttempts === 0
        ? 0
        : results.reduce((sum, r) => sum + r.score, 0) / totalAttempts;

    const topScore =
      totalAttempts === 0
        ? 0
        : Math.max(...results.map((r) => r.score));

    res.json({
      totalAttempts,
      averageScore: averageScore.toFixed(2),
      topScore
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===============================
   DISTRIBUTE PRIZE (COINS)
=============================== */
router.post(
  "/distribute/:contestId",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const contest = await Contest.findById(req.params.contestId);
      if (!contest)
        return res.status(404).json({ msg: "Contest not found" });

      if (contest.prizeDistributed) {
        return res.status(400).json({ msg: "Prize already distributed" });
      }

      const winnerResult = await Result.find({
        contest: contest._id
      })
        .sort({ score: -1, timeTaken: 1 })
        .limit(1)
        .populate("user");

      if (!winnerResult.length)
        return res.status(400).json({ msg: "No attempts found" });

      const winner = winnerResult[0].user;

      // 🪙 COINS PRIZE
      winner.coins += contest.prizePool;
      await winner.save();

      contest.prizeDistributed = true;
      contest.winner = winner._id;
      contest.status = "completed";
      await contest.save();

      res.json({
        msg: "Prize distributed successfully",
        winner: winner.fullName,
        coins: contest.prizePool
      });
    } catch (err) {
      res.status(500).json({ msg: "Server error" });
    }
  }
);


/* ===============================
   CHECK ATTEMPT STATUS
=============================== */
router.get("/attempted/:contestId", protect, async (req, res) => {
  const attempted = await Result.exists({
    user: req.user.id,
    contest: req.params.contestId
  });

  res.json({ attempted: !!attempted });
});


module.exports = router;
