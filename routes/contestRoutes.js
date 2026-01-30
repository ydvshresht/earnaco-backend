const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const User = require("../models/User");

/* ===============================
   CREATE CONTEST (ADMIN)
================================ */
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { test, prizePool, entryFee, maxSpots } = req.body;

    const testDoc = await Test.findById(test);
    if (!testDoc || testDoc.questions.length === 0) {
      return res.status(400).json({
        msg: "Invalid test or no questions"
      });
    }

    testDoc.isActive = true;
    await testDoc.save();

    const contest = await Contest.create({
      test,
      prizePool,
      entryFee,
      maxSpots,
      joinedUsers: [],
      status: "active",
      prizeDistributed: false
    });

    res.json({ contest });
  } catch (err) {
    next(err);
  }
});

/* ===============================
   GET CONTESTS (USER)
================================ */
router.get("/", protect, async (req, res, next) => {
  try {
    const contests = await Contest.find({ status: "active" })
      .populate("test", "testName duration");
    res.json(contests);
  } catch (err) {
    next(err);
  }
});

/* ===============================
   GET CONTESTS (ADMIN)
================================ */
router.get("/admin", protect, adminOnly, async (req, res, next) => {
  try {
    const contests = await Contest.find()
      .populate("test", "testName");
    res.json(contests);
  } catch (err) {
    next(err);
  }
});

/* ===============================
   DELETE CONTEST (ADMIN)
================================ */
router.delete(
  "/admin/:contestId",
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      await Contest.findByIdAndDelete(req.params.contestId);
      res.json({ msg: "Contest deleted" });
    } catch (err) {
      next(err);
    }
  }
);

/* ===============================
   JOIN CONTEST (USER)
================================ */
router.post("/join/:contestId", protect, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    const user = await User.findById(req.user.id);
    const company = await User.findOne({ role: "admin" });

    if (!contest || contest.status !== "active")
      return res.status(400).json({ msg: "Contest unavailable" });

    if (contest.joinedUsers.includes(user._id))
      return res.status(400).json({ msg: "Already joined" });

    if (user.wallet < contest.entryFee)
      return res.status(400).json({ msg: "Insufficient balance" });

    user.wallet -= contest.entryFee;
    company.wallet += contest.entryFee;

    await user.save();
    await company.save();

    contest.joinedUsers.push(user._id);
    await contest.save();

    res.json({ msg: "Joined successfully", balance: user.wallet });
  } catch (err) {
    next(err);
  }
});

/* ===============================
   CAN START TEST
================================ */
router.get("/can-start/:contestId", protect, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest)
      return res.status(404).json({ msg: "Contest not found" });

    const joined = contest.joinedUsers.includes(req.user.id);
    if (!joined)
      return res.status(403).json({ msg: "Not joined" });

    res.json({ allowed: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
