const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Test = require("../models/Test");

/* ===============================
   CREATE TEST (ADMIN)
   POST /api/tests
================================ */
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { testName, duration } = req.body;

    const test = await Test.create({
      testName,
      duration,
      questions: [],
      isActive: false,
      isDaily: false
    });

    res.json({ test });
  } catch (err) {
    next(err);
  }
});

/* ===============================
   GET ALL TESTS (ADMIN)
   GET /api/tests/admin
================================ */
router.get("/admin", protect, adminOnly, async (req, res, next) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    next(err);
  }
});

/* ===============================
   GET SINGLE TEST (ADMIN – FULL)
   GET /api/tests/admin/:testId
================================ */
router.get("/admin/:testId", protect, adminOnly, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }
    res.json(test);
  } catch (err) {
    next(err);
  }
});

/* ===============================
   ADD QUESTION (ADMIN)
   POST /api/tests/admin/:testId/questions
================================ */
router.post(
  "/admin/:testId/questions",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const { question, options, correctAnswer } = req.body;

      if (!question || !options || options.length !== 4) {
        return res.status(400).json({ msg: "Invalid question data" });
      }

      const test = await Test.findById(req.params.testId);
      if (!test) {
        return res.status(404).json({ msg: "Test not found" });
      }

      test.questions.push({ question, options, correctAnswer });
      await test.save();

      res.json({ msg: "Question added" });
    } catch (err) {
      next(err);
    }
  }
);

/* ===============================
   DELETE QUESTION (ADMIN)
   DELETE /api/tests/admin/:testId/questions/:index
================================ */
router.delete(
  "/admin/:testId/questions/:index",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (!test) {
        return res.status(404).json({ msg: "Test not found" });
      }

      const index = Number(req.params.index);
      if (index < 0 || index >= test.questions.length) {
        return res.status(400).json({ msg: "Invalid question index" });
      }

      test.questions.splice(index, 1);
      await test.save();

      res.json({ msg: "Question deleted" });
    } catch (err) {
      next(err);
    }
  }
);

/* ===============================
   ACTIVATE TEST (ADMIN)
   PATCH /api/tests/admin/:testId/activate
================================ */
router.patch(
  "/admin/:testId/activate",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (!test) {
        return res.status(404).json({ msg: "Test not found" });
      }

      if (test.questions.length === 0) {
        return res.status(400).json({ msg: "Add questions first" });
      }

      test.isActive = true;
      await test.save();

      res.json({ msg: "Test activated" });
    } catch (err) {
      next(err);
    }
  }
);

/* ===============================
   GET TEST FOR ATTEMPT (USER)
   GET /api/tests/:testId
================================ */
router.get("/:testId", protect, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test || !test.isActive) {
      return res.status(404).json({ msg: "Test unavailable" });
    }

    const safeQuestions = test.questions.map(q => ({
      question: q.question,
      options: q.options
    }));

    res.json({
      testName: test.testName,
      duration: test.duration,
      questions: safeQuestions
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
