// app/http/controllers/userController.js

const User = require('../../models/User');

exports.userInfo = async (req, res) => {
    const user = await User.findById(req.user?.id).populate('info');
    if (!user) {
        return res.status(401).json({ message: 'User not found.', success: false });
    }

    return res.json({
        success: true,
        data: {
            id: user._id,
            email: user.email,
            info: user.info ? {
                firstName: user.info.firstName,
                lastName:  user.info.lastName,
                gender:    user.info.gender,
                phoneCountry: user.info.phoneCountry,
                phoneNumber:  user.info.phoneNumber,
                birthday:     user.info.birthday,
                avatar:       user.info.avatar,
            } : null,
        },
    });
};
