const mongoose = require("mongoose");

const contestSchema = new mongoose.Schema({
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true
  },

  prizePool: {
    type: Number,
    required: true
  },

  entryFee: {
    type: Number,
    required: true
  },

  maxSpots: {
    type: Number,
    required: true
  },

  joinedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  status: {
    type: String,
    enum: ["upcoming", "active", "completed", "archived"],
    default: "upcoming"
  },
  prizeDistributed: {
  type: Boolean,
  default: false
},
winner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}

});

module.exports = mongoose.model("Contest", contestSchema);
