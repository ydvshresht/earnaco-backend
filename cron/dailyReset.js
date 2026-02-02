const cron = require("node-cron");
const Contest = require("../models/Contest");
const Test = require("../models/Test");
const Question = require("../models/Question");
const { closeContest } = require("../services/contestService");

/**
 * 🕛 DAILY RESET – 12:00 AM IST
 */
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("🕛 Daily contest cron started");

    try {
      /* =========================
         1️⃣ CLOSE YESTERDAY’S DAILY CONTEST
      ========================= */
      const activeDaily = await Contest.findOne({
        status: "live",
        isDaily: true
      });

      if (activeDaily) {
        await closeContest(activeDaily._id);
      }

      /* =========================
         2️⃣ DISABLE OLD DAILY TESTS
      ========================= */
      await Test.updateMany(
        { isDaily: true },
        { isActive: false }
      );

      /* =========================
         3️⃣ CHECK IF TODAY’S CONTEST EXISTS
      ========================= */
      const today = new Date().toDateString();

      const existing = await Contest.findOne({
        isDaily: true,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      if (existing) {
        console.log("⚠️ Daily contest already exists, skipping creation");
        return;
      }

      /* =========================
         4️⃣ CREATE TODAY’S TEST
      ========================= */
      const questions = await Question.aggregate([
        { $sample: { size: 5 } }
      ]);

      if (!questions.length) {
        console.log("❌ No questions available");
        return;
      }

      const test = await Test.create({
        testName: `Daily Test - ${today}`,
        duration: 10,
        questions,
        isActive: true,
        isDaily: true,
        isDraft: false
      });

      /* =========================
         5️⃣ CREATE TODAY’S CONTEST
      ========================= */
      await Contest.create({
        test: test._id,
        prizePool: 50,
        entryFee: 5,
        maxSpots: 100,
        status: "live",
        isDaily: true
      });

      console.log("✅ Daily contest reset done");
    } catch (err) {
      console.error("❌ Daily cron failed:", err);
    }
  },
  { timezone: "Asia/Kolkata" }
);
