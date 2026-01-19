const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Contest = require("../models/Contest");
const User = require("../models/User");

/**
 * ===============================
 * CREATE CONTEST (ADMIN)
 * ===============================
 */
router.post("/", protect, async (req, res, next) => {
  try {
    const { test, prizePool, entryFee, maxSpots } = req.body;

    const contest = await Contest.create({
      test,
      prizePool,
      entryFee,
      maxSpots
    });

    res.json({
      msg: "Contest created successfully",
      contest
    });
  } catch (err) {
  next(err);
}

});

/**
 * ===============================
 * GET ALL CONTESTS
 * ===============================
 */
router.get("/", protect, async (req, res) => {
  const contests = await Contest.find()
    .populate("test", "testName");

  res.json(contests);
});

/**
 * ===============================
 * GET SINGLE CONTEST (FULL DATA)
 * ===============================
 */
router.get("/:contestId", protect, async (req, res, next) => {
  try {
    const { contestId } = req.params;

    // ✅ GUARD
    if (!contestId || contestId === "null") {
      return res.status(400).json({
        msg: "Invalid contest ID"
      });
    }

    const contest = await Contest.findById(contestId)
      .populate({
        path: "test",
        select: "testName duration questions"
      });

    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    res.json(contest);
  } catch (err) {
  next(err);
}

});


/**
 * ===============================
 * BUY / JOIN CONTEST
 * ===============================
 */
router.post("/buy/:contestId", protect, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.contestId);
    const user = await User.findById(req.user.id);

    // 👑 COMPANY ACCOUNT
    const company = await User.findOne({ role: "admin" });

    if (!contest)
      return res.status(404).json({ msg: "Contest not found" });

    if (!company)
      return res.status(500).json({ msg: "Company account missing" });

    // Already joined
    const joined = contest.joinedUsers.some(
      (u) => u.toString() === req.user.id
    );

    if (joined)
      return res.status(400).json({ msg: "Already joined" });

    if (user.wallet < contest.entryFee)
      return res.status(400).json({ msg: "Insufficient balance" });

    /* =======================
       MONEY FLOW
    ======================= */

    // 1️⃣ Deduct from user
    user.wallet -= contest.entryFee;
    await user.save();

    // 2️⃣ Add to company wallet
    company.wallet += contest.entryFee;
    await company.save();

    // 3️⃣ Add user to contest
    await Contest.findByIdAndUpdate(
      contest._id,
      { $addToSet: { joinedUsers: user._id } }
    );

    /* =======================
       SAVE TRANSACTION LOG
    ======================= */
    const Transaction = require("../models/Transaction");

    await Transaction.create({
      user: user._id,
      amount: contest.entryFee,
      type: "entry",
      status: "success"
    });

    res.json({
      msg: "Contest joined successfully",
      balance: user.wallet
    });

  } catch (err) {
    next(err);
  }
});



/**
 * ===============================
 * CHECK IF USER CAN START TEST
 * ===============================
 */
router.get("/can-start/:contestId", protect, async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.contestId);

    if (!contest) {
      return res.status(404).json({ msg: "Contest not found" });
    }

    const joined = contest.joinedUsers.some(
      (u) => u.equals(req.user.id)
    );

    if (!joined) {
      return res.status(403).json({
        msg: "User has not joined this contest"
      });
    }

    res.json({ allowed: true });
  } catch (err) {
  next(err);
}

});


module.exports = router;
