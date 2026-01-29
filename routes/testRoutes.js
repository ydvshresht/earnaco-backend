const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Test = require("../models/Test");
const adminOnly = require("../middleware/adminMiddleware");
/**
 * ===============================
 * CREATE TEST (ADMIN)
 * ===============================
 */


router.post("/", protect, adminOnly, async (req, res, next) => {

  try {
    const { testName, duration, questions } = req.body;

    const test = await Test.create({
      testName,
      duration,
      questions
    });

    res.json({
      msg: "Test created successfully",
      test
    });
  } catch (err) {
  next(err);
}

});

/**
 * ===============================
 * GET ALL TESTS
 * ===============================
 */
router.get("/", protect, async (req, res, next) => {
  try {
    const tests = await Test.find({ isActive: true })
      .select("testName duration");

    res.json(tests);
  } catch (err) {
    next(err);
  }
});


/**
 * ===============================
 * GET SINGLE TEST (FOR ATTEMPT)
 * ===============================
 */
router.get("/:testId", protect, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId);

    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    res.json({
      testName: test.testName,
      duration: test.duration,
      questions: test.questions
    });
  }catch (err) {
  next(err);
}

});

module.exports = router;
