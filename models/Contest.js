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
    enum: ["draft", "live", "completed"],
    default: "draft"
  },
isDaily: {
  type: Boolean,
  default: false
},

  entriesCount: {
    type: Number,
    default: 0
  },
  prizeDistributed: {
  type: Boolean,
  default: false
},
isArchived: {
  type: Boolean,
  default: false
},

winner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}

});

module.exports = mongoose.model("Contest", contestSchema);
