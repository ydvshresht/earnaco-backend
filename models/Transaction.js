const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    type: {
      type: String,
      enum: ["deposit", "withdraw", "prize", "fee"],
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpayPayoutId: String,

    upi: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
