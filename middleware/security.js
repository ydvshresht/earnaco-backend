const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests / 15 min
  message: "Too many requests, slow down"
});

exports.securityHeaders = helmet();
