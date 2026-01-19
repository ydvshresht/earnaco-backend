const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });

    console.log("EMAIL SENT:", data);

  } catch (err) {
    console.log("EMAIL FAILED:", err);
  }
};

module.exports = sendEmail;
