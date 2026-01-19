const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", protect, (req, res) => {
  res.json({
    msg: "Welcome to protected dashboard 🚀",
    userId: req.user
  });
});

module.exports = router;
