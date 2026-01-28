const cron = require("node-cron");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Question = require("../models/Question");
const Result = require("../models/Result");

cron.schedule(
  "24 6 * * *", // 🕛 12:00 AM daily
  async () => {
    console.log("🕛 Daily contest reset started");

    try {
      // 0️⃣ Safety check
      const activeContest = await Contest.findOne({ status: "active" });
      if (activeContest) {
        console.log("⚠ Active contest already exists. Skipping.");
        return;
      }

      // 1️⃣ Close old contests
      const closed = await Contest.updateMany(
        { status: { $in: ["active", "upcoming"] } },
        { status: "completed" }
      );
      console.log("🗑 Contests closed:", closed.modifiedCount);

      // 2️⃣ Disable old daily tests
      await Test.updateMany({ isDaily: true }, { isActive: false });

      // 3️⃣ Get random questions
      const questions = await Question.aggregate([
        { $sample: { size: 5 } }
      ]);

      if (!questions.length) {
        console.log("❌ No questions available");
        return;
      }

      // 4️⃣ Create new test
      const newTest = await Test.create({
        testName: `Daily Test - ${new Date().toDateString()}`,
        duration: 10,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        })),
        isActive: true,
        isDaily: true
      });

      // 5️⃣ Create contest
      const newContest = await Contest.create({
        test: newTest._id,
        prizePool: 100,
        entryFee: 10,
        maxSpots: 100,
        joinedUsers: [],
        status: "active",
        prizeDistributed: false
      });

      console.log("🏆 New contest created:", newContest._id);

    } catch (err) {
      console.error("❌ Daily cron error:", err);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
