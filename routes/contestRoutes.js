const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const User = require("../models/User");

/* ===============================
   CREATE CONTEST (WIZARD STEP 3)
================================ */
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { test, prizePool, entryFee, maxSpots } = req.body;

    const testDoc = await Test.findById(test);
    if (!testDoc || testDoc.questions.length === 0) {
      return res.status(400).json({ msg: "Invalid test" });
    }

    const contest = await Contest.create({
      test,
      prizePool,
      entryFee,
      maxSpots,
      joinedUsers: [],
      status: "draft",
      prizeDistributed: false
    });

    res.json({ contest });
  } catch (err) {
    next(err);
  }
});
/* ===============================
   GET LIVE CONTESTS (USER)
================================ */
router.get("/", protect, async (req, res, next) => {
  try {
    const contests = await Contest.find({ status: "live" })
      .populate("test", "testName duration");

    res.json(contests);
  } catch (err) {
    next(err);
  }
});
router.patch(
  "/admin/:contestId/live",
  protect,
  adminOnly,
  async (req, res) => {
    const contest = await Contest.findById(req.params.contestId).populate("test");
    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    if (contest.status !== "draft") {
      return res.status(400).json({ msg: "Contest already live" });
    }

    if (!contest.test || contest.test.isDraft) {
      return res.status(400).json({ msg: "Test not finalized" });
    }

    contest.status = "live";
    await contest.save();

    res.json({ msg: "Contest is live" });
  }
);

/* ===============================
   GET SINGLE CONTEST (USER)
================================ */
router.get(
  "/:contestId",
  protect,
  async (req, res, next) => {
    try {
      const contest = await Contest.findById(req.params.contestId)
        .populate("test"); // full test needed for ContestPage

      if (!contest) {
        return res.status(404).json({ msg: "Contest not found" });
      }

      if (contest.status !== "live") {
        return res.status(403).json({ msg: "Contest not live" });
      }

      res.json(contest);
    } catch (err) {
      next(err);
    }
  }
);

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
   GET CONTEST FOR EDIT WIZARD
================================ */
router.get(
  "/admin/:contestId/edit",
  protect,
  adminOnly,
  async (req, res) => {
    const contest = await Contest.findById(req.params.contestId)
      .populate("test");

    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    res.json({
      contest,
      editable: contest.joinedUsers.length === 0
    });
  }
);

/* ===============================
   UPDATE CONTEST SETTINGS
================================ */
router.patch(
  "/admin/:contestId",
  protect,
  adminOnly,
  async (req, res) => {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) return res.status(404).json({ msg: "Contest not found" });

    const { prizePool, entryFee, maxSpots } = req.body;

    contest.prizePool = prizePool;
    contest.entryFee = entryFee;
    contest.maxSpots = maxSpots;

    await contest.save();
    res.json({ msg: "Contest updated" });
  }
);

/* ===============================
   SWITCH TEST (EDIT WIZARD)
================================ */
router.patch(
  "/admin/:contestId/switch-test",
  protect,
  adminOnly,
  async (req, res) => {
    const { testId } = req.body;

    const contest = await Contest.findById(req.params.contestId);
    if (!contest) return res.status(404).json({ msg: "Contest not found" });

    contest.test = testId;
    await contest.save();

    res.json({ msg: "Contest test switched" });
  }
);

/* ===============================
   DELETE CONTEST (ADMIN)
================================ */
router.delete(
  "/admin/:contestId",
  protect,
  adminOnly,
  async (req, res) => {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) return res.status(404).json({ msg: "Contest not found" });

    if (contest.joinedUsers.length > 0) {
      return res.status(400).json({ msg: "Contest has entries" });
    }
    if (contest.status === "live") {
  return res.status(400).json({ msg: "Cannot delete live contest" });
}

    await contest.deleteOne();
    res.json({ msg: "Contest deleted" });
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

    if (!contest || contest.status !== "live") {
      return res.status(400).json({ msg: "Contest unavailable" });
    }

    if (contest.joinedUsers.includes(user._id)) {
      return res.status(400).json({ msg: "Already joined" });
    }
    if (contest.joinedUsers.length >= contest.maxSpots) {
  return res.status(400).json({ msg: "Contest is full" });
}

    if (user.wallet < contest.entryFee) {
      return res.status(400).json({ msg: "Insufficient balance" });
    }

    user.wallet -= contest.entryFee;
    company.wallet += contest.entryFee;

    contest.joinedUsers.push(user._id);

    await user.save();
    await company.save();
    await contest.save();

    res.json({ msg: "Joined successfully", balance: user.wallet });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
