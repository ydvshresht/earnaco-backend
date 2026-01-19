const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  type: { enum: ["credit","debit"], type: String },
  reason: String,
  balanceAfter: Number
},{timestamps:true});

module.exports = mongoose.model("Ledger", ledgerSchema);
