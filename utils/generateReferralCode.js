const crypto = require("crypto");
const User = require("../models/User");

/**
 * Generate UNIQUE referral code
 * Format: EA-AB3F9K2Q
 */
const generateReferralCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code =
      "EA-" +
      crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();

    exists = await User.exists({ referralCode: code });
  }

  return code;
};

module.exports = generateReferralCode;
