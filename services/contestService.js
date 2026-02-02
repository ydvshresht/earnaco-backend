const Contest = require("../models/Contest");
const Result = require("../models/Result");
const User = require("../models/User");
const CoinTransaction = require("../models/CoinTransaction");

async function closeContest(contestId) {
  const contest = await Contest.findById(contestId);
  if (!contest) return null;

  if (contest.status !== "live") return contest;

  // 🏆 Find winner
  const winnerResult = await Result.find({ contest: contestId })
    .sort({ score: -1, timeTaken: 1 })
    .limit(1)
    .populate("user");

  if (winnerResult.length && !contest.prizeDistributed) {
    const winner = winnerResult[0].user;

    winner.coins += contest.prizePool;
    await winner.save();

    await CoinTransaction.create({
      user: winner._id,
      type: "credit",
      coins: contest.prizePool,
      reason: "Contest prize"
    });

    contest.winner = winner._id;
    contest.prizeDistributed = true;
  }

  contest.status = "completed";
  await contest.save();

  return contest;
}

module.exports = { closeContest };
