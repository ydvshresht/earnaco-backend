const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    validate: v => v.length === 4
  },
  correctAnswer: {
    type: Number, // index 0–3
    required: true
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "easy"
  }
});

module.exports = mongoose.model("Question", questionSchema);
