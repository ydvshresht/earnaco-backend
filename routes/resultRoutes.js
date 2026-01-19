const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const Result = require("../models/Result");
const Test = require("../models/Test");
const Contest = require("../models/Contest");
const User = require("../models/User");

/**
 * ===============================
 * SUBMIT TEST RESULT (SECURE)
 * ===============================
 */
router.post("/submit", protect, async (req, res, next) => {
  try {
    const { testId, contestId, answers, timeTaken } = req.body;

    // 🔒 Prevent re-attempt
    const alreadyAttempted = await Result.findOne({
      user: req.user.id,
      test: testId
    });

    if (alreadyAttempted) {
      return res.status(400).json({
        msg: "You have already attempted this test"
      });
    }

    // 📄 Load test
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    // 🧮 Calculate score on backend
    let score = 0;

    test.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        score++;
      }
    });
const detailedAnswers = test.questions.map((q, index) => {
  const userIndex = answers[index];

  return {
    question: q.question,
    correctAnswer: q.options[q.correctAnswer], // ✅ text
    userAnswer:
      userIndex !== undefined
        ? q.options[userIndex]
        : "Not Attempted",
    status:
      userIndex === q.correctAnswer ? "Right" : "Wrong"
  };
});

    const result = await Result.create({
      user: req.user.id,
      test: testId,
      contest: contestId,
      score,
      totalQuestions: test.questions.length,
      answers:detailedAnswers,
      timeTaken
    });

    res.json({
      msg: "Result saved successfully",
      score,
      totalQuestions: test.questions.length,
      resultId: result._id
    });
  }catch (err) {
  next(err);
}

});

/**
 * ===============================
 * GET MY RESULT FOR A TEST
 * ===============================
 */
router.get("/my-tests", protect, async (req, res, next) => {
  try {
    const results = await Result.find({ user: req.user.id })
      .populate("test", "testName")
      .sort({ createdAt: -1 });

    res.json(results);
  }catch (err) {
  next(err);
}

});

/**
 * ===============================
 * LEADERBOARD
 * ===============================
 */
const { isLeaderboardOpen } = require("../utils/timeWindow");
router.get("/leaderboard/:testId", async (req, res, next) => {
  try {
    // ⛔ BLOCK OUTSIDE TIME WINDOW
    if (!isLeaderboardOpen()) {
      return res.status(403).json({
        msg: "Leaderboard is available only between 7 PM and 12 AM",
        openAt: "01:00",
        closeAt: "02:00"
      });
    }

    const leaderboard = await Result.find({ test: req.params.testId })
      .populate("user", "fullName userId")
      .sort({ score: -1, timeTaken: 1 }) // ⭐ score DESC, time ASC
      .limit(10);

    res.json(leaderboard);
  } catch (err) {
  next(err);
}

});

/**
 * ===============================
 * ADMIN ANALYTICS
 * ===============================
 */
router.get("/analytics/:testId", protect, async (req, res, next) => {
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
  }catch (err) {
  next(err);
}

});

/**
 * ===============================
 * DISTRIBUTE PRIZE (ADMIN / SYSTEM)
 * ===============================
 */

router.post("/distribute/:contestId", protect, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.contestId);

    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    if (contest.prizeDistributed) {
      return res.status(400).json({ msg: "Prize already distributed" });
    }

    // 🏆 Get top result
    const winnerResult = await Result.find({ contest: contest._id })
      .sort({ score: -1, timeTaken: 1 })
      .limit(1)
      .populate("user");

    if (winnerResult.length === 0) {
      return res.status(400).json({ msg: "No attempts found" });
    }

    const winner = winnerResult[0].user;

    // 💰 Add prize to wallet
    winner.wallet += contest.prizePool;
    await winner.save();

    // 🏁 Mark contest completed
    contest.prizeDistributed = true;
    contest.winner = winner._id;
    contest.status = "completed";
    await contest.save();

    res.json({
      msg: "Prize distributed successfully",
      winner: winner.fullName,
      prize: contest.prizePool
    });
  } catch (err) {
  next(err);
}

});

// CHECK IF USER ALREADY ATTEMPTED TEST
router.get("/attempted/:testId", protect, async (req, res, next) => {
  try {
    const result = await Result.findOne({
      user: req.user.id,
      test: req.params.testId
    });

    res.json({ attempted: !!result });
  } catch (err) {
  next(err);
}

});

module.exports = router;
