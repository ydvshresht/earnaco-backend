const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Test = require("../models/Test");

/* ===============================
   CREATE TEST (WIZARD STEP 1)
================================ */
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { testName, duration } = req.body;

    if (!testName) {
      return res.status(400).json({ msg: "Test name required" });
    }

    const test = await Test.create({
      testName,
      duration,
      questions: [],
      isActive: false,
      isDaily: false,
      isDraft: true
    });

    res.json({ test });
  } catch (err) {
    next(err);
  }
});

/* ===============================
   GET ALL TESTS (ADMIN)
   (Optional – mostly for debug)
================================ */
router.get("/admin", protect, adminOnly, async (req, res, next) => {
  try {
    const tests = await Test.find().select(
      "testName duration isActive isDraft"
    );
    res.json(tests);
  } catch (err) {
    next(err);
  }
});

/* ===============================
   GET SINGLE TEST (ADMIN)
================================ */
router.get("/admin/:testId", protect, adminOnly, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ msg: "Test not found" });
    res.json(test);
  } catch (err) {
    next(err);
  }
});

/* ===============================
   ADD QUESTION (WIZARD STEP 2)
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
      if (!test) return res.status(404).json({ msg: "Test not found" });

      if (!test.isDraft) {
        return res
          .status(400)
          .json({ msg: "Cannot modify finalized test" });
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
================================ */
router.delete(
  "/admin/:testId/questions/:index",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (!test) return res.status(404).json({ msg: "Test not found" });

      if (!test.isDraft) {
        return res
          .status(400)
          .json({ msg: "Cannot modify finalized test" });
      }

      test.questions.splice(req.params.index, 1);
      await test.save();

      res.json({ msg: "Question deleted" });
    } catch (err) {
      next(err);
    }
  }
);

/* ===============================
   FINALIZE + ACTIVATE TEST
   (WIZARD STEP 3 – AFTER CONTEST)
================================ */
router.patch(
  "/admin/:testId/finalize",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const test = await Test.findById(req.params.testId);
      if (!test) return res.status(404).json({ msg: "Test not found" });

      if (test.questions.length === 0) {
        return res.status(400).json({ msg: "Add questions first" });
      }

      test.isDraft = false;
      test.isActive = true;
      await test.save();

      res.json({ msg: "Test finalized & activated" });
    } catch (err) {
      next(err);
    }
  }
);

/* ===============================
   GET TEST FOR USER ATTEMPT
================================ */
router.get("/:testId", protect, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test || !test.isActive || test.isDraft) {
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
