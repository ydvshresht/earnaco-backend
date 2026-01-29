const mongoose = require("mongoose");
const Ledger = require("../models/Ledger");
const User = require("../models/User");

/* =====================
   CREDIT COINS
===================== */
exports.credit = async (
  userId,
  coins,
  reason = "credit"
) => {
  if (!coins || coins <= 0) {
    throw new Error("Invalid credit amount");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    user.coins = (user.coins || 0) + coins;
    await user.save({ session });

    await Ledger.create(
      [{
        user: userId,
        amount: coins,
        type: "credit",
        reason,
        balanceAfter: user.coins
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return user.coins;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

/* =====================
   DEBIT COINS
===================== */
exports.debit = async (
  userId,
  coins,
  reason = "debit"
) => {
  if (!coins || coins <= 0) {
    throw new Error("Invalid debit amount");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    if ((user.coins || 0) < coins) {
      throw new Error("Insufficient coins");
    }

    user.coins -= coins;
    await user.save({ session });

    await Ledger.create(
      [{
        user: userId,
        amount: coins,
        type: "debit",
        reason,
        balanceAfter: user.coins
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return user.coins;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
