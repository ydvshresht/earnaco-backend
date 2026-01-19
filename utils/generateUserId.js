// backend/utils/generateUserId.js

const crypto = require("crypto");

const generateUserId = () => {
  // 10-character alphanumeric ID
  return crypto.randomBytes(5).toString("hex").toUpperCase();
};

module.exports = generateUserId;
