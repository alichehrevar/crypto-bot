const Settings = require("../../models/Settings");
const emailService = require("../emailService");
const logger = require("../../../logs/logger");
const User = require("../../models/User");

exports.sendOtpAndHandleFailure = async (user) => {

    Settings.findOne()
        .then(settings => {
            if (!settings.enableEmail) {
                return { message: 'Email Service is not enabled.', success: false };
            }
        });


    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if the OTP has expired
    if (!user.enable2FA && user.otpExpires !== null && user.otpExpires < new Date()) {
        const remainingTime = (user.otpExpires.getTime() - new Date().getTime()) / (1000 * 60);
        if (remainingTime < 0) {
            return { message: 'Please retry after 10 minutes.', success: false };
        }
    }

    // Send the OTP email
    const emailSent = await emailService.sendOtpEmail(user.email, otp);

    if (!emailSent) {
        // This is an internal server error, as the email should have sent.
        // You might want to log this failure more robustly.
        logger.error(`Failed to send otp email, email: ${user.email}`, {stack: 'Otp email failed to send'});
        return { message: 'Failed to send OTP email.', success: false };
    }

    // If OTP sent successfully, save the OTP and its expiry to the user model
    await User.updateOne(
        { _id: user._id },
        {
            otp: otp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
    )

    return { message: 'Otp Sent', success: true };
}
