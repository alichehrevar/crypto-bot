const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../app/models/User');

router.post('/register', async (req, res) => {
    try {
        const user = await User.create(req.body);
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
});

module.exports = router;
