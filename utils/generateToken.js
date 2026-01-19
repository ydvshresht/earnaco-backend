const jwt = require("jsonwebtoken");

module.exports = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "2h"
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd, // true in prod
    sameSite: isProd ? "none" : "lax",
    domain: isProd ? ".earnaco.com" : undefined,
    maxAge: 2 * 60 * 60 * 1000
  });

  return token;
};
