const cron = require("node-cron");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Question = require("../models/Question");
const Result = require("../models/Result");
const User = require("../models/User");

/**
 * 🕛 DAILY RESET – 12:00 AM IST
 */
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("🕛 Daily contest cron started");

    try {
      /* =========================
         1️⃣ DISTRIBUTE PRIZE FOR OLD CONTEST
      ========================= */
     const activeContest = await Contest.findOne({
  status: "live",
  isDaily: true,
  prizeDistributed: false
}).populate("test");


      if (activeContest) {
        const winnerResult = await Result.find({
          contest: activeContest._id
        })
          .sort({ score: -1, timeTaken: 1 })
          .limit(1)
          .populate("user");

        if (winnerResult.length) {
          const winner = winnerResult[0].user;

          // 🪙 CREDIT COINS
          winner.wallet += activeContest.prizePool;
          await winner.save();

          activeContest.winner = winner._id;
          activeContest.prizeDistributed = true;
        }

        activeContest.status = "completed";
        await activeContest.save();

        console.log("🏆 Contest closed:", activeContest._id);
      }

      /* =========================
         2️⃣ DISABLE OLD DAILY TESTS
      ========================= */
      await Test.updateMany(
        { isDaily: true },
        { isActive: false }
      );

      /* =========================
         3️⃣ CHECK IF TODAY'S CONTEST EXISTS
      ========================= */
      const today = new Date().toDateString();

      const existing = await Test.findOne({
        testName: `Daily Test - ${today}`
      });

      if (existing) {
        console.log("⚠️ Daily test already exists, skipping creation");
        return;
      }

      /* =========================
         4️⃣ FETCH RANDOM QUESTIONS
      ========================= */
      const questions = await Question.aggregate([
        { $sample: { size: 5 } }
      ]);

      if (!questions.length) {
        console.log("❌ No questions available");
        return;
      }

      /* =========================
         5️⃣ CREATE DAILY TEST
      ========================= */
      const newTest = await Test.create({
        testName: `Daily Test - ${today}`,
        duration: 10,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        })),
        isActive: true,
        isDaily: true
      });

      /* =========================
         6️⃣ CREATE DAILY CONTEST (COINS)
      ========================= */
      const newContest = await Contest.create({
  test: newTest._id,
  prizePool: 50,
  entryFee: 5,
  maxSpots: 100,
  joinedUsers: [],
  status: "live",          // ✅ SAME AS MANUAL
  isDaily: true,           // 🔥 KEY DIFFERENCE
  prizeDistributed: false
});


      console.log("✅ New daily contest created:", newContest._id);

    } catch (err) {
      console.error("❌ Daily cron failed:", err);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
