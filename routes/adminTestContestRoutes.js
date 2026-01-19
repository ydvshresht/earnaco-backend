const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const Contest = require("../models/Contest");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

/* =====================
   TEST MANAGEMENT
===================== */

// GET ALL TESTS
router.get("/tests", protect, adminOnly, async (req, res) => {
  const tests = await Test.find().sort({ createdAt: -1 });
  res.json(tests);
});

// CREATE TEST
router.post("/create-test", protect, adminOnly, async (req, res) => {
  const { testName, duration, questions } = req.body;

  const test = await Test.create({
    testName,
    duration,
    questions,
    isActive: true
  });

  res.json({ msg: "Test created", test });
});

// DELETE TEST
router.delete("/test/:id", protect, adminOnly, async (req, res) => {
  await Test.findByIdAndDelete(req.params.id);
  res.json({ msg: "Test deleted" });
});

/* =====================
   CONTEST MANAGEMENT
===================== */

// GET ALL CONTESTS
router.get("/contests", protect, adminOnly, async (req, res) => {
  const contests = await Contest.find()
    .populate("test", "testName")
    .sort({ createdAt: -1 });

  res.json(contests);
});

// CREATE CONTEST
router.post("/create-contest", protect, adminOnly, async (req, res) => {
  const { test, prizePool, entryFee, maxSpots } = req.body;

  const contest = await Contest.create({
    test,
    prizePool,
    entryFee,
    maxSpots,
    joinedUsers: [],
    status: "upcoming",
    prizeDistributed: false
  });

  res.json({ msg: "Contest created", contest });
});

// DELETE CONTEST
router.delete("/contest/:id", protect, adminOnly, async (req, res) => {
  await Contest.findByIdAndDelete(req.params.id);
  res.json({ msg: "Contest deleted" });
});

module.exports = router;
