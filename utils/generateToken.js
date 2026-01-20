const jwt = require("jsonwebtoken");

module.exports = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "2h"
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,       // JS can't access
    secure: isProd,      // HTTPS only in prod
    sameSite: isProd ? "none" : "lax",
    maxAge: 2 * 60 * 60 * 1000
  });

  return token;
};
