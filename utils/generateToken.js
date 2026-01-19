const jwt = require("jsonwebtoken");

module.exports = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "2h"
  });

 res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  domain: ".earnaco.com",
  path: "/",
  maxAge: 2 * 60 * 60 * 1000
});



  return token;
};
