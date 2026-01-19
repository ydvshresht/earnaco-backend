const FraudLog = require("../models/FraudLog");

module.exports = async (
 user,
 reason,
 severity,
 ip,
 device,
 action
)=>{
 await FraudLog.create({
  user,
  reason,
  severity,
  ip,
  device,
  action
 });
};
