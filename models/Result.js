const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    
    timeTaken: {
      type: Number // seconds
    },
   answers: [
  {
    question: String,
    correctAnswer: String, // ✅ text
    userAnswer: String,    // ✅ text
    status: {
      type: String,
      enum: ["Right", "Wrong"]
    }
  }
]


  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", resultSchema);
