const multer = require('multer');
const path = require('path');

// Configure storage engine
const storage = multer.diskStorage({
    destination: './public/uploads/avatars',
    filename: function (req, file, cb) {
        // We use the user's ID for a unique, predictable filename
        // Assumes you have user info in req.user from an auth middleware
        const uniqueSuffix = req.user.id + '-' + Date.now();
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to validate that only images are uploaded
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Only image files are allowed!'), false);
    }
};

// Initialize upload middleware
const uploadAvatar = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
    fileFilter: fileFilter
}).single('avatar'); // 'avatar' is the field name from your form

module.exports = uploadAvatar;
