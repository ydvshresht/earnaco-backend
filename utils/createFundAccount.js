const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = async (contactId, upi) => {
  return await razorpay.fundAccount.create({
    contact_id: contactId,   // ✅ correct
    account_type: "vpa",
    vpa: {
      address: upi
    }
  });
};
