const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Donation = require('../models/Donation');

// Middleware to check if user is authenticated and is a recipient
const isRecipient = async (req, res, next) => {
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

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.redirect('/login');
    }
};

// Food request form page
router.get('/request-food', isRecipient, async (req, res) => {
    try {
        res.render('recipient/request', {
            user: req.user,
            title: 'Request Food',
            message: req.flash('message')
        });
    } catch (error) {
        console.error('Error rendering request form:', error);
        res.redirect('/error');
    }
});

// Handle food request submission
router.post('/request-food', isRecipient, async (req, res) => {
    try {
        const { foodType, quantity, preferredPickupTime, specialInstructions } = req.body;
        
        // Create new food request
        const request = new Donation({
            donorId: null, // Will be assigned when donor accepts
            recipientId: req.user._id,
            foodType,
            quantity,
            status: 'pending',
            pickupTime: preferredPickupTime,
            specialInstructions,
            createdAt: new Date()
        });

        await request.save();
        
        req.flash('message', 'Food request submitted successfully!');
        res.redirect('/recipient/my-requests');
    } catch (error) {
        console.error('Error creating food request:', error);
        req.flash('message', 'Error submitting food request. Please try again.');
        res.redirect('/recipient/request-food');
    }
});

// Request a specific donation
router.get('/request/donation/:id', isRecipient, async (req, res) => {
    try {
        const donationId = req.params.id;
        const donation = await Donation.findById(donationId);
        
        if (!donation) {
            return res.status(404).render('error', {
                message: 'Donation not found'
            });
        }

        // Save donation details to localStorage for the request form
        localStorage.setItem(`userDonations_${donation.donor}`, JSON.stringify([donation]));
        
        res.redirect(`/recipient/request-food?foodId=${donationId}`);
    } catch (error) {
        console.error('Error loading donation:', error);
        res.status(500).render('error', {
            message: 'Error loading donation details'
        });
    }
});

// Available donations page
router.get('/available-donations', isRecipient, async (req, res) => {
    try {
        // Get donations that are pending and in the recipient's location
        const availableDonations = await Donation.find({
            status: 'pending',
            pickupLocation: req.user.location
        }).sort({ createdAt: -1 });

        res.render('recipient/available_donations', {
            title: 'Available Donations - ShareBites',
            user: req.user,
            availableDonations
        });
    } catch (error) {
        console.error('Error fetching available donations:', error);
        res.status(500).render('error', {
            message: 'Error loading available donations'
        });
    }
});

// Request a donation
router.post('/api/donations/:id/request', isRecipient, async (req, res) => {
    try {
        const donationId = req.params.id;
        const recipientId = req.user._id;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        if (donation.status !== 'pending') {
            return res.status(400).json({ message: 'Donation is no longer available' });
        }

        // Update donation status and add recipient
        donation.status = 'accepted';
        donation.recipient = recipientId;
        await donation.save();

        // Award points to donor
        const donor = await User.findById(donation.donor);
        donor.points += 10; // 10 points for accepted donation
        await donor.save();

        res.json({ message: 'Donation requested successfully' });
    } catch (error) {
        console.error('Error requesting donation:', error);
        res.status(500).json({ message: 'Error requesting donation' });
    }
});

// My requests page
router.get('/my-requests', isRecipient, async (req, res) => {
    try {
        const myRequests = await Donation.find({
            recipient: req.user._id
        }).sort({ createdAt: -1 });

        res.render('recipient/my_requests', {
            title: 'My Requests - ShareBites',
            user: req.user,
            requests: myRequests
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).render('error', {
            message: 'Error loading requests'
        });
    }
});

module.exports = router;