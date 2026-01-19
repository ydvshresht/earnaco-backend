const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    bankName: {
      type: String,
      required: true
    },

    accountNumber: {
      type: String,
      required: true
    },

    ifsc: {
      type: String,
      required: true
    },

    isPrimary: {
      type: Boolean,
      default: false
    },

    autoPayEnabled: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bank", bankSchema);
