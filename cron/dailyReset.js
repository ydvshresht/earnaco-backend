const cron = require("node-cron");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Question = require("../models/Question"); // 🔴 MISSING IMPORT
const Result = require("../models/Result");
/**
 * 🕛 RUNS EVERY DAY AT 12:00 AM
 * ───────────────────────────
 * 1. Close old contests
 * 2. Create a new contest
 */
cron.schedule("40 18 * * *", async () => {
  console.log("🕛 Daily contest reset started");

  try {
    const deletedResults = await Result.deleteMany({});
    console.log("🗑 Old results deleted:", deletedResults.deletedCount);

     // 1️⃣ DELETE OLD CONTESTS
    const deleted = await Contest.deleteMany({});
    console.log("🗑 Old contests deleted:", deleted.deletedCount);

   // 1️⃣ Disable old tests
    await Test.updateMany({}, { isActive: false });

    // 2️⃣ Fetch random questions
    const questions = await Question.aggregate([
      { $sample: { size: 5 } } // 5 questions daily
    ]);

    if (questions.length === 0) {
      console.log("❌ No questions available");
      return;
    }

    // 3️⃣ Create new test
    const newTest = await Test.create({
      testName: `Daily Test - ${new Date().toDateString()}`,
      duration: 10,
      questions: questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      isActive: true
    });

    console.log("✅ New Test Created:", newTest._id);

    // 4️⃣ Create contest for that test
    const newContest = await Contest.create({
      test: newTest._id,
      prizePool: 100,
      entryFee: 10,
      maxSpots: 100,
      joinedUsers: [],
      status: "upcoming",
      prizeDistributed: false
    });

    console.log("🏆 New Contest Created:", newContest._id);

  } catch (err) {
    console.error("❌ Daily test cron error:", err);
  }
});
