const Contest = require("../models/Contest");
const Result = require("../models/Result");
const User = require("../models/User");
const CoinTransaction = require("../models/CoinTransaction");

async function closeContest(contestId) {
  const contest = await Contest.findById(contestId);

  if (!contest) {
    throw new Error("Contest not found");
  }

  if (contest.status !== "live") {
    throw new Error("Contest not live");
  }

  // 🏆 Find winner result
  const winnerResult = await Result.find({ contest: contestId })
    .sort({ score: -1, timeTaken: 1 })
    .limit(1)
    .populate("user");

  if (
    winnerResult.length &&
    winnerResult[0].user &&            // ✅ IMPORTANT CHECK
    !contest.prizeDistributed
  ) {
    const winner = winnerResult[0].user;

    await User.updateOne(
      { _id: winner._id },
      { $inc: { coins: contest.prizePool } }
    );

    await CoinTransaction.create({
      user: winner._id,
      type: "credit",
      coins: contest.prizePool,
      reason: "Contest prize"
    });
  }

  // 🧹 Delete contest after completion
  await Contest.findByIdAndDelete(contestId);

  return true;
}

module.exports = { closeContest };
