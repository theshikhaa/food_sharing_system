const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, phone, password, userType } = req.body;
        
        // Log the request body
        console.log('Registration attempt:', { name, email, phone, userType });

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).render('register', {
                title: 'Register - ShareBites',
                error: 'Email already exists'
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            phone,
            password,
            userType: userType || 'recipient' // Default to recipient if not specified
        });

        console.log('User created successfully:', user._id);

        // Redirect to login page
        res.redirect('/login?registered=true');
    } catch (error) {
        console.error('Registration error:', error);
        const message = error.name === 'ValidationError' && error.errors?.password
            ? 'Password must be at least 6 characters long'
            : error.message;
        res.status(400).render('register', {
            title: 'Register - ShareBites',
            error: message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            return res.status(401).render('login', {
                title: 'Login - ShareBites',
                error: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.correctPassword(password);
        if (!isPasswordValid) {
            console.log('Invalid password');
            return res.status(401).render('login', {
                title: 'Login - ShareBites',
                error: 'Invalid email or password'
            });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        console.log('Login successful, redirecting to section page');
        return res.redirect('/section');
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).render('login', {
            title: 'Login - ShareBites',
            error: 'An error occurred during login'
        });
    }
};