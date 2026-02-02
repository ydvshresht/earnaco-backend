const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const User = require("../models/User");
const CoinTransaction = require("../models/CoinTransaction");
const Result = require("../models/Result");

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
   CAN START TEST (USER)
================================ */
router.get(
  "/can-start/:contestId",
  protect,
  async (req, res, next) => {
    try {
      const contest = await Contest.findById(req.params.contestId);
 
      if (!contest) {
        return res.status(404).json({ msg: "Contest not found" });
      }

      if (contest.status !== "live") {
        return res.status(403).json({ msg: "Contest not live" });
      }

     const joined = contest.joinedUsers.some(
  (id) => id.toString() === req.user.id.toString()
);


      if (!joined) {
        return res.status(403).json({ msg: "Not joined" });
      }

      res.json({ allowed: true });
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
    const contests = await Contest.find({
      status: { $ne: "completed" } // 🔒 hide archived
    }).populate("test", "testName");

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
    try {
      const contest = await Contest.findById(req.params.contestId)
        .populate("test");

      if (!contest) {
        return res.status(404).json({
          msg: "Contest not found"
        });
      }

      // 🔒 archived contest
      if (contest.status === "completed") {
        return res.status(400).json({
          msg: "Completed contests are archived"
        });
      }

      res.json({
        contest,
        editable: (contest.joinedUsers?.length || 0) === 0
      });
    } catch (err) {
      console.error("EDIT CONTEST ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
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
    try {
      const contest = await Contest.findById(req.params.contestId);

      if (!contest) {
        return res.status(404).json({
          msg: "Contest not found"
        });
      }

      // ❌ Never delete completed contests
      if (contest.status === "completed") {
        return res.status(400).json({
          msg: "Completed contests cannot be deleted"
        });
      }

      // ❌ Cannot delete live contest with entries
      if (
        contest.status === "live" &&
        (contest.joinedUsers?.length || 0) > 0
      ) {
        return res.status(400).json({
          msg: "Contest has entries"
        });
      }

      await contest.deleteOne();

      res.json({ msg: "Contest deleted" });
    } catch (err) {
      console.error("DELETE CONTEST ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);



/* ===============================
   JOIN CONTEST (USER)
================================ */
router.post("/join/:contestId", protect, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.contestId);

    if (!contest || contest.status !== "live") {
      return res.status(400).json({ msg: "Contest unavailable" });
    }

    if (contest.joinedUsers.includes(req.user.id)) {
      return res.status(400).json({ msg: "Already joined" });
    }

    if (contest.joinedUsers.length >= contest.maxSpots) {
      return res.status(400).json({ msg: "Contest full" });
    }

    // 🪙 Deduct coins
    const user = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        coins: { $gte: contest.entryFee }
      },
      { $inc: { coins: -contest.entryFee } },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ msg: "Insufficient coins" });
    }

    // ✅ Record coin transaction (ADD HERE)
    await CoinTransaction.create({
      user: user._id,
      coins: contest.entryFee,
      type: "debit",
      reason: "Contest entry"
    });

    contest.joinedUsers.push(user._id);
    await contest.save();

    res.json({
      msg: "Joined successfully",
      coins: user.coins
    });
  } catch (err) {
    next(err);
  }
});
router.get("/attempted/:contestId", protect, async (req, res) => {
  const count = await Result.countDocuments({
    user: req.user.id,
    contest: req.params.contestId
  });

  res.json({ attempted: count > 0 });
});


const { closeContest } = require("../services/contestService");

router.post(
  "/admin/:contestId/reset",
  protect,
  adminOnly,
  async (req, res) => {
    const contest = await Contest.findById(req.params.contestId);
    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    if (contest.status !== "live") {
      return res.status(400).json({ msg: "Contest not live" });
    }

    await closeContest(contest._id);

    res.json({ msg: "Contest closed & reset successfully" });
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
module.exports = router;
