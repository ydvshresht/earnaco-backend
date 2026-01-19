const cron = require("node-cron");
const Contest = require("../models/Contest");
const Result = require("../models/Result");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

cron.schedule(
  "28 00 * * *", // Daily 12:28 AM
  async () => {
    console.log("🏆 Prize distribution started");

    try {
      const contests = await Contest.find({
        prizeDistributed: false,
        status: "completed"
      });

      console.log("📦 Contests found:", contests.length);

      for (const contest of contests) {

        console.log("🎯 Processing contest:", contest._id);

        const results = await Result.find({
          contest: contest._id
        })
          .sort({ score: -1, timeTaken: 1 })
          .populate("user");

        if (!results.length) continue;

        const prize = contest.prizePool;

        const splits = [
          { rank: 0, percent: 0.6 },
          { rank: 1, percent: 0.3 },
          { rank: 2, percent: 0.1 }
        ];

        // 🔐 COMPANY WALLET
        const admin = await User.findOne({ role: "admin" });

        if (!admin || admin.wallet < prize) {
          console.log("❌ Company wallet insufficient");
          continue;
        }

        for (const s of splits) {

          const winner = results[s.rank];
          if (!winner) continue;

          const amount = Math.floor(prize * s.percent);

          /* 1️⃣ Deduct from company */
          admin.wallet -= amount;

          /* 2️⃣ Credit winner */
          await User.findByIdAndUpdate(
            winner.user._id,
            { $inc: { wallet: amount } }
          );

          /* 3️⃣ Save transaction */
          await Transaction.create({
            user: winner.user._id,
            amount,
            type: "prize",
            status: "success",
            source: "company_wallet",
            contest: contest._id
          });

          console.log(
            `💰 ₹${amount} sent to ${winner.user.email}`
          );
        }

        await admin.save();

        contest.prizeDistributed = true;
        contest.status = "completed";
        await contest.save();

        console.log("✅ Contest closed:", contest._id);
      }

      console.log("🏁 Prize distribution finished");

    } catch (err) {
      console.error("❌ Prize cron error:", err);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
