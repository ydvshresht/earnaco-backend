const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
coins: {
  type: Number,
  default: 0
},

     amount: {
      type: Number,
      default: 0 // real money
    },
type: {
      type: String,
      enum: [
        "coin_credit",
        "coin_debit",
        "deposit",
        "buy_coins"
      ],
      required: true
    },
 reason: {
      type: String // ad, referral, contest, prize, purchase
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpayPayoutId: String,
lastAdWatchedAt: Date,
    upi: String
  },
  
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
