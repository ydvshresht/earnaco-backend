const mongoose = require("mongoose");

const coinTxnSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    coins: Number,
    type: { type: String, enum: ["credit", "debit"] },
    reason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoinTransaction", coinTxnSchema);
