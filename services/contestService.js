const mongoose = require("mongoose");
const Contest = require("../models/Contest");
const Result = require("../models/Result");
const User = require("../models/User");
const CoinTransaction = require("../models/CoinTransaction");

async function closeContest(contestId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contest = await Contest.findById(contestId).session(session);
    if (!contest) {
      throw new Error("Contest not found");
    }

    if (contest.status !== "live") {
      throw new Error("Contest not live");
    }

    // 🏆 Find winner
    const winnerResult = await Result.find({ contest: contestId })
      .sort({ score: -1, timeTaken: 1 })
      .limit(1)
      .populate("user")
      .session(session);

    if (winnerResult.length && !contest.prizeDistributed) {
      const winner = winnerResult[0].user;

      await User.updateOne(
        { _id: winner._id },
        { $inc: { coins: contest.prizePool } },
        { session }
      );

      await CoinTransaction.create(
        [
          {
            user: winner._id,
            type: "credit",
            coins: contest.prizePool,
            reason: "Contest prize"
          }
        ],
        { session }
      );
    }

    // 🧹 DELETE contest after completion
    await Contest.deleteOne({ _id: contestId }).session(session);

    await session.commitTransaction();
    session.endSession();

    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = { closeContest };
