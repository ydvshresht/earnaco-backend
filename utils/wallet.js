const Ledger = require("../models/Ledger");
const User = require("../models/User");

exports.credit = async (userId, amount, reason) => {
  const user = await User.findById(userId);
  user.wallet += amount;
  await user.save();

  await Ledger.create({
    user:userId,
    amount,
    type:"credit",
    reason,
    balanceAfter:user.wallet
  });
};

exports.debit = async (userId, amount, reason) => {
  const user = await User.findById(userId);
  user.wallet -= amount;
  await user.save();

  await Ledger.create({
    user:userId,
    amount,
    type:"debit",
    reason,
    balanceAfter:user.wallet
  });
};
