module.exports = (req, res, next) => {
  req.deviceId =
    req.headers["x-device-id"] ||
    req.headers["user-agent"];

  req.userIp =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress;

  next();
};
