const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { 
    sendEmail,
    sendWelcomeEmail,
    sendOrderConfirmationEmail
} = require('../utils/emailService');
const User = require('../Models/User');
const crypto = require('crypto');

/**
 * @route POST /api/email/test
 * @desc Test email sending
 * @access Private/Admin
 */
router.post('/test', protect, admin, async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;
        
        if (!to) {
            return res.status(400).json({ message: 'Recipient email is required' });
        }
        
        const result = await sendEmail({
            to,
            subject: subject || 'Test Email from Pawvot',
            text: text || 'This is a test email from Pawvot',
            html: html || '<h1>Test Email</h1><p>This is a test email from Pawvot</p>'
        });
        
        if (result) {
            res.status(200).json({ 
                message: 'Email sent successfully', 
                messageId: result.messageId 
            });
        } else {
            res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/email/welcome
 * @desc Send welcome email to user
 * @access Public
 */
router.post('/welcome', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({ message: 'Email and name are required' });
        }
        
        const result = await sendWelcomeEmail(email, name);
        
        if (result) {
            res.status(200).json({ 
                message: 'Welcome email sent successfully', 
                messageId: result.messageId 
            });
        } else {
            res.status(500).json({ message: 'Welcome email could not be sent' });
        }
    } catch (error) {
        console.error('Error sending welcome email:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/email/order-confirmation
 * @desc Send order confirmation email
 * @access Private
 */
router.post('/order-confirmation', protect, async (req, res) => {
    try {
        const { email, name, order } = req.body;
        
        if (!email || !name || !order) {
            return res.status(400).json({ 
                message: 'Email, name, and order details are required' 
            });
        }
        
        const result = await sendOrderConfirmationEmail(email, name, order);
        
        if (result) {
            res.status(200).json({ 
                message: 'Order confirmation email sent successfully', 
                messageId: result.messageId 
            });
        } else {
            res.status(500).json({ message: 'Order confirmation email could not be sent' });
        }
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/email/verify-email
 * @desc Verify user's email
 * @access Public
 */
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ message: 'Verification token is required' });
        }
        
        // Hash the token to match how it's stored in the database
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        
        // Find user with matching token and token not expired
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpire: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        
        // Mark email as verified and clear token
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();
        
        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 