const cron = require("node-cron");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Question = require("../models/Question");

cron.schedule(
  "0 0 * * *", // 🕛 12:00 AM IST
  async () => {
    console.log("🕛 Daily contest reset started");

    try {
      // 1️⃣ Close old contests
      const closed = await Contest.updateMany(
        { status: { $in: ["active", "upcoming"] } },
        { status: "completed" }
      );
      console.log("🗑 Contests closed:", closed.modifiedCount);

      // 2️⃣ Disable old daily tests
      await Test.updateMany({ isDaily: true }, { isActive: false });

      // 3️⃣ Fetch random questions
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

      // 5️⃣ Create new contest (ONLY ONE)
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
