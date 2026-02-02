const mongoose = require("mongoose");

const coinTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    coins: {
      type: Number,
      required: true // 🔥 force it
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["success", "pending", "failed"],
      default: "success"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoinTransaction", coinTransactionSchema);
