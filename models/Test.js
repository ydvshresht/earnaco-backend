const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    testName: String,
    duration: Number, // minutes
    questions: [
      {
        question: String,
        options: [String],
        correctAnswer: Number
      }
    ],
    isDraft: {
  type: Boolean,
  default: true
},

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);
