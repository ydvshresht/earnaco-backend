const express = require("express");
const protect = require("../middleware/authMiddleware");
const SupportTicket = require("../models/SupportTicket");

const router = express.Router();

/**
 * 📩 CREATE TICKET
 */
router.post("/", protect, async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ msg: "All fields required" });
  }

  const ticket = await SupportTicket.create({
    user: req.user.id,
    subject,
    message
  });

  res.json({ msg: "Ticket submitted successfully", ticket });
});

/**
 * 📂 GET USER TICKETS
 */
router.get("/my", protect, async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user.id })
    .sort({ createdAt: -1 });

  res.json(tickets);
});

module.exports = router;
