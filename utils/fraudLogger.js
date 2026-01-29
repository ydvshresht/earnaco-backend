const FraudLog = require("../models/FraudLog");

/**
 * Central fraud logging utility
 * Never throws (important for auth flows)
 */
module.exports = async (
  user,
  reason,
  severity = "low",   // low | medium | high
  ip = "unknown",
  device = "unknown",
  action = "logged"   // logged | blocked | warned
) => {
  try {
    await FraudLog.create({
      user,
      reason,
      severity,
      ip,
      device,
      action,
      createdAt: new Date()
    });
  } catch (err) {
    // ❗ Never crash app because of logging
    console.error("FRAUD LOGGER FAILED:", err.message);
  }
};
