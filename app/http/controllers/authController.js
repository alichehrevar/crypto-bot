const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
    try {
        // Extract email and password from the request body.
        const { email, password } = req.body;
        // Look up the user by email.
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Compare the provided password with the hashed password.
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // If credentials are valid, create a JWT.
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Return the token to the client.
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.register = async (req, res) => {
    try {
        // Extract email and password from the request body.
        const { email, password, repeat_password } = req.body;
        if (password !== repeat_password) {
            return res.status(401).json({ error: 'Password must match' });
        }

        // Look up the user by email.
        let user = await User.findOne({ email });
        if (user) {
            // If user exists send warning
            return res.status(401).json({ error: 'You registered before. Please use login' });
        } else {
            // Create user
            user = await User.create({
                email: email,
                password: password
            });
        }
        // Registered successfully, create a JWT.
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Return the token to the client.
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
