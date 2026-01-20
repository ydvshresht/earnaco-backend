const jwt = require("jsonwebtoken");

module.exports = (res, payload) => {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not defined");
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "2h"
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,            // JS cannot read
    secure: isProd,           // HTTPS only in prod
    sameSite: isProd ? "none" : "lax",
    path: "/",                // IMPORTANT
    maxAge: 2 * 60 * 60 * 1000,

    // domain ONLY in production
    ...(isProd && { domain: ".earnaco.com" })
  });

  return token;
};
