require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Donation = require('./models/Donation');

const app = express();

// Connect to MongoDB
connectDB();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Debug log
console.log('Views directory:', path.join(__dirname, 'views'));

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP temporarily for development
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve views/error.css directly as /css/error.css
app.get('/css/error.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/error.css'));
});

// Mapping for recipient-dashboard to use EJS template
app.get('/recipient-dashboard', (req, res) => {
    res.redirect('/recipient/dashboard');
});

// Import routes
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const donorRoutes = require('./routes/donorRoutes');
const recipientRoutes = require('./routes/recipientRoutes');

// Mount donor routes
app.use('/donor', donorRoutes);

// Mount recipient routes
app.use('/recipient', recipientRoutes);

// Auth routes
app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Register - ShareBites',
        error: null
    });
});

app.post('/register', authController.register);

app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login - ShareBites',
        error: null,
        registered: req.query.registered === 'true'
    });
});

app.post('/login', authController.login);

// Section route
app.get('/section', (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            console.log('No token found');
            return res.redirect('/login');
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.log('Invalid token');
                return res.redirect('/login');
            }
            
            console.log('Rendering section page');
            res.render('section', {
                title: 'Choose Your Role - ShareBites'
            });
        });
    } catch (error) {
        console.error('Section route error:', error);
        res.redirect('/login');
    }
});

// Role update route
app.post('/update-role', userController.updateRole);

// Donor dashboard route
app.get('/donor/dashboard', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'donor') {
            return res.redirect('/section');
        }

        res.render('donor/dashboard', {
            title: 'Donor Dashboard - ShareBites',
            user
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/login');
    }
});

// Recipient dashboard route
app.get('/recipient/dashboard', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Get active requests count
        const activeRequests = await Donation.countDocuments({
            recipient: user._id,
            status: 'accepted'
        });

        // Get saved items count
        const savedItems = await Donation.countDocuments({
            savedBy: user._id
        });

        // Get total meals received (completed donations)
        const mealsReceived = await Donation.countDocuments({
            recipient: user._id,
            status: 'completed'
        });

        // Get available food near the user
        const availableFood = await Donation.find({
            status: 'pending',
            // Add location-based filtering here if you have location data
        }).limit(4).sort({ createdAt: -1 });

        res.render('recipient/recipient_dashboard', {
            title: 'Recipient Dashboard - ShareBites',
            user,
            stats: {
                mealsReceived,
                activeRequests,
                savedItems
            },
            availableFood
        });
    } catch (error) {
        console.error('Recipient dashboard error:', error);
        res.redirect('/login');
    }
});

// Recipient browse food route
app.get('/recipient/browse', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        res.render('recipient/browse', {
            title: 'Browse Food - ShareBites',
            user
        });
    } catch (error) {
        console.error('Browse food error:', error);
        res.redirect('/login');
    }
});

// Recipient saved items route
app.get('/recipient/saved', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Get saved items for this user
        const savedItems = await Donation.find({
            savedBy: user._id,
            status: 'pending' // Only show items that are still available
        }).sort({ createdAt: -1 });

        res.render('recipient/saved', {
            title: 'Saved Items - ShareBites',
            user,
            savedItems
        });
    } catch (error) {
        console.error('Saved items error:', error);
        res.redirect('/login');
    }
});

// Recipient profile route
app.get('/recipient/profile', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Get total meals received (completed donations)
        const mealsReceived = await Donation.countDocuments({
            recipient: user._id,
            status: 'completed'
        });

        // Calculate member since date
        const memberSince = user.createdAt ? new Date(user.createdAt) : new Date();
        const memberSinceFormatted = memberSince.toLocaleDateString('en-US', { 
            month: 'long',
            year: 'numeric'
        });

        // For new users, reliability rating starts at null
        const reliabilityRating = user.reliabilityRating || 'New Member';

        res.render('recipient/profile', {
            title: 'Profile - ShareBites',
            user,
            stats: {
                mealsReceived,
                memberSince: memberSinceFormatted,
                reliabilityRating
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.redirect('/login');
    }
});

// Handle profile update
app.post('/recipient/update-profile', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Update user profile
        const { name, email, phone, location, bio } = req.body;
        
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.location = location;
        user.bio = bio;
        
        await user.save();

        res.redirect('/recipient/profile?updated=true');
    } catch (error) {
        console.error('Profile update error:', error);
        res.redirect('/recipient/profile?error=true');
    }
});

// Handle notification preferences update
app.post('/recipient/update-notifications', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Update notification preferences
        const { email_notifications, request_updates, community_updates } = req.body;
        
        user.notificationPreferences = {
            emailNotifications: !!email_notifications,
            requestUpdates: !!request_updates,
            communityUpdates: !!community_updates
        };
        
        await user.save();

        res.redirect('/recipient/profile?updated=true');
    } catch (error) {
        console.error('Notification update error:', error);
        res.redirect('/recipient/profile?error=true');
    }
});

// Handle unsaving items
app.post('/recipient/unsave/:itemId', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const itemId = req.params.itemId;
        
        // Remove the user's ID from the savedBy array of the donation
        await Donation.findByIdAndUpdate(itemId, {
            $pull: { savedBy: user._id }
        });

        res.json({ message: 'Item unsaved successfully' });
    } catch (error) {
        console.error('Error unsaving item:', error);
        res.status(500).json({ message: 'Error unsaving item' });
    }
});

// Recipient request route
app.get('/recipient/request', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Get food item ID from query parameter
        const foodId = req.query.id || '';

        res.render('recipient/request', {
            title: 'Request Food - ShareBites',
            user,
            foodId
        });
    } catch (error) {
        console.error('Request page error:', error);
        res.redirect('/login');
    }
});

// Handle request submission
app.post('/recipient/submit-request', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // In a real app, you would save the request to the database here
        console.log('Food request submitted:', req.body);

        // Redirect to dashboard with success message
        res.redirect('/recipient/my-requests?requestSubmitted=true');
    } catch (error) {
        console.error('Request submission error:', error);
        res.redirect('/recipient/dashboard?requestError=true');
    }
});

// Recipient my requests route
app.get('/recipient/my-requests', async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.userType !== 'recipient') {
            return res.redirect('/section');
        }

        // Check if a request was just submitted
        const requestSubmitted = req.query.requestSubmitted === 'true';

        res.render('recipient/my-requests', {
            title: 'My Requests - ShareBites',
            user,
            requestSubmitted
        });
    } catch (error) {
        console.error('My requests error:', error);
        res.redirect('/login');
    }
});

// Landing page route
app.get('/', (req, res) => {
    try {
        res.render('landing', {
            title: 'FoodShare - Share More, Waste Less'
        });
    } catch (err) {
        console.error('Rendering error:', err);
        res.status(500).send('Error rendering page');
    }
});

// Add this before your other error handlers
app.use((req, res, next) => {
    console.log('404 - Not Found:', req.originalUrl);
    res.status(404).render('404', {
        title: '404 - Not Found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).render('error', {
        message: err.message || 'Something went wrong!'
    });
});

// 404 handler - must be last
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));