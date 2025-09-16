// app/services/emailService.js

const nodemailer = require('nodemailer');

// Create a reusable transporter object using your Brevo SMTP credentials
// This object is configured once and can be used to send all your app's emails.
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_HOST,
    port: process.env.BREVO_PORT,
    secure: false, // false for port 587
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
    },
});

/**
 * Sends an OTP email.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} otp - The one-time password.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
const sendOtpEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: process.env.MAIL_FROM_ADDRESS,
        to: toEmail,
        subject: `Your Verification Code is ${otp}`,
        html: `
      <div style="font-family: Arial, sans-serif; text-align: center; color: #333; padding: 20px;">
        <h2>Verification Code</h2>
        <p>Please use the following code to complete your action:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background-color: #f0f0f0; padding: 10px 20px; display: inline-block; border-radius: 5px;">
          ${otp}
        </p>
        <p>This code is valid for 10 minutes.</p>
        <hr/>
        <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email.</p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent successfully to ${toEmail}`);
        return true;
    } catch (error) {
        console.error(`Error sending OTP email to ${toEmail}:`, error);
        return false;
    }
};

module.exports = {
    sendOtpEmail
};
