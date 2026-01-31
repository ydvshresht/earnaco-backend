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
        return res.status(400).json({ msg: "Test already finalized" });
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
        return res.status(400).json({ msg: "Test already finalized" });
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
   CLONE TEST (EDIT WIZARD)
================================ */
router.post(
  "/admin/:testId/clone",
  protect,
  adminOnly,
  async (req, res) => {
    const oldTest = await Test.findById(req.params.testId);
    if (!oldTest) return res.status(404).json({ msg: "Test not found" });

    const clonedTest = await Test.create({
      testName: oldTest.testName + " (Edited)",
      duration: oldTest.duration,
      questions: oldTest.questions,
      isActive: false,
      isDaily: false,
      isDraft: true
    });

    res.json({ test: clonedTest });
  }
);

/* ===============================
   FINALIZE + ACTIVATE TEST
   (WIZARD FINAL STEP)
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

    res.json({
      testName: test.testName,
      duration: test.duration,
      questions: test.questions.map(q => ({
        question: q.question,
        options: q.options
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
