const nodemailer = require('nodemailer');
const config = require('../config');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');

// Create transporter with updated configuration for better Gmail SMTP compatibility
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // use STARTTLS
    auth: {
        user: config.EMAIL_USERNAME,
        pass: config.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false // don't fail on invalid certs
    }
});

// Verify transporter configuration at startup
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP server connection error:', error);
    } else {
        console.log('SMTP server connection established successfully');
    }
});

/**
 * Compile a handlebars template with provided data
 * @param {string} templateName - Name of the template file (without extension)
 * @param {Object} data - Data to use when compiling the template
 * @returns {Promise<string>} - The compiled HTML
 */
const compileTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
        const source = await fs.readFile(templatePath, 'utf8');
        const template = handlebars.compile(source);
        return template(data);
    } catch (error) {
        console.error(`Error compiling template ${templateName}:`, error);
        throw error;
    }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendEmail = async (options) => {
    // Skip sending emails if credentials are missing
    if (!config.EMAIL_USERNAME || !config.EMAIL_PASSWORD) {
        console.log('Email sending skipped: Missing email credentials');
        console.log('Please check your .env file and make sure EMAIL_USERNAME and EMAIL_PASSWORD are set');
        return null;
    }
    
    const message = {
        from: `Pawvot-noreply <${config.EMAIL_FROM || config.EMAIL_USERNAME}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    try {
        console.log('Attempting to send email with the following configuration:');
        console.log(`- SMTP Host: ${transporter.options.host}`);
        console.log(`- SMTP Port: ${transporter.options.port}`);
        console.log(`- From: ${message.from}`);
        console.log(`- To: ${message.to}`);
        console.log(`- Subject: ${message.subject}`);
        
        const info = await transporter.sendMail(message);
        console.log('Email sent: ', info.messageId);
        if (info.messageUrl) {
            console.log('Preview URL: %s', info.messageUrl);
        }
        return info;
    } catch (error) {
        console.error('Error sending email:');
        console.error(`- Error name: ${error.name}`);
        console.error(`- Error message: ${error.message}`);
        
        if (error.code === 'EAUTH') {
            console.error('Authentication error - check your email username and password');
        } else if (error.code === 'ESOCKET') {
            console.error('Socket error - check your network connectivity and firewall settings');
        } else if (error.code === 'ECONNECTION') {
            console.error('Connection error - check that your SMTP host and port are correct');
        }
        
        // Just log the error but don't throw it, to prevent disrupting app flow
        return null;
    }
};

/**
 * Send a verification email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
    try {
        const serverUrl = 'http://localhost:5000';
        const verificationLink = `http://localhost:3000/verify-email?token=${token}`;
        
        // Compile the email verification template
        const html = await compileTemplate('emailVerification', {
            name,
            verificationLink,
            logoUrl: `${serverUrl}/images/pawvot.png`,
            facebookUrl: `${serverUrl}/images/facebook.png`,
            twitterUrl: `${serverUrl}/images/twitter.png`,
            instagramUrl: `${serverUrl}/images/instagram.png`,
            tiktokUrl: `${serverUrl}/images/tik-tok.png`,
            year: new Date().getFullYear()
        });
        
        return sendEmail({
            to: email,
            subject: 'Verify Your Email | Pawvot',
            text: `Hi ${name}, Please verify your email address by clicking the following link: ${verificationLink}`,
            html
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
        // Don't throw the error to prevent disrupting registration flow
        return null;
    }
};

/**
 * Send a password reset email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (email, name, token) => {
    try {
        const resetLink = `${config.CLIENT_URL}/reset-password?token=${token}`;
        
        // Compile the password reset template
        const html = await compileTemplate('passwordReset', {
            name,
            resetLink,
            logoUrl: `${config.CLIENT_URL}/logo.png`,
            year: new Date().getFullYear()
        });
        
        return sendEmail({
            to: email,
            subject: 'Reset Your Password | Pawvot',
            text: `Hi ${name}, Please reset your password by clicking the following link: ${resetLink}`,
            html
        });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        // Don't throw the error
        return null;
    }
};

/**
 * Send order confirmation email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {Object} order - Order details
 */
const sendOrderConfirmationEmail = async (email, name, order) => {
    try {
        // Handle MongoDB ObjectId
        const orderId = order._id.toString ? order._id.toString() : String(order._id);
        const orderUrl = `${config.CLIENT_URL}/orders/${orderId}`;
        
        // Format order items for the template
        const formattedItems = order.items.map(item => ({
            name: item.product?.name || 'Product',
            quantity: item.quantity,
            price: item.price?.toFixed(2) || '0.00',
            totalPrice: (item.price * item.quantity).toFixed(2) || '0.00',
            image: item.product?.images?.[0] || 'https://via.placeholder.com/60x60?text=Product'
        }));
        
        // Calculate free shipping
        const freeShipping = order.shippingCost === 0;
        
        // Prepare template data
        const templateData = {
            customerName: name,
            orderId: orderId.substring(0, 8), // Use first 8 chars of ID for display
            items: formattedItems,
            subtotal: order.subtotal?.toFixed(2) || '0.00',
            tax: order.tax?.toFixed(2) || '0.00',
            shippingCost: order.shippingCost?.toFixed(2) || '0.00',
            total: order.totalPrice?.toFixed(2) || '0.00',
            freeShipping,
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod === 'credit-card' ? 'Credit Card' : 'Cash on Delivery',
            paymentStatus: order.isPaid ? 'Paid' : 'Pending',
            orderUrl,
            logoUrl: `${config.CLIENT_URL}/logo.png`,
            currentYear: new Date().getFullYear()
        };
        
        // Compile the order confirmation template
        const html = await compileTemplate('orderConfirmation', templateData);
        
        return sendEmail({
            to: email,
            subject: `Order Confirmation #${orderId.substring(0, 8)} | Pawvot`,
            text: `Hi ${name}, Thank you for your order! Your order #${orderId.substring(0, 8)} has been received and is being processed.`,
            html
        });
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        // Don't throw the error
        return null;
    }
};

/**
 * Send booking confirmation email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {Object} booking - Booking details
 * @param {Object} pet - Pet details
 */
const sendBookingConfirmationEmail = async (email, name, booking, pet) => {
    try {
        const bookingId = booking._id.toString ? booking._id.toString() : String(booking._id);
        const bookingDate = new Date(booking.visitDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Prepare template data
        const templateData = {
            customerName: name,
            petName: pet.name,
            petBreed: pet.breed,
            bookingDate,
            visitTime: booking.visitTime,
            location: pet.location,
            bookingId: bookingId,
            logoUrl: `${config.CLIENT_URL}/logo.png`,
            currentYear: new Date().getFullYear()
        };
        
        // Compile the booking confirmation template
        const html = await compileTemplate('bookingConfirmation', templateData);
        
        return sendEmail({
            to: email,
            subject: `Booking Confirmation - ${pet.name} | Pawvot`,
            text: `Hi ${name}, Your visit with ${pet.name} has been scheduled for ${bookingDate} at ${booking.visitTime}.`,
            html
        });
    } catch (error) {
        console.error('Error sending booking confirmation email:', error);
        // Don't throw the error
        return null;
    }
};

/**
 * Send welcome email to new user
 * @param {string} email - User's email
 * @param {string} name - User's name
 */
const sendWelcomeEmail = async (email, name) => {
    try {
        // Prepare template data
        const templateData = {
            customerName: name,
            loginUrl: `${config.CLIENT_URL}/login`,
            exploreProductsUrl: `${config.CLIENT_URL}/products`,
            explorePetsUrl: `${config.CLIENT_URL}/pets`,
            logoUrl: `${config.CLIENT_URL}/logo.png`,
            currentYear: new Date().getFullYear()
        };
        
        // Try to compile the welcome template if it exists
        let html;
        try {
            html = await compileTemplate('welcomeEmail', templateData);
        } catch (err) {
            // If template doesn't exist, use a simple HTML email
            html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${config.CLIENT_URL}/logo.png" alt="Pawvot Logo" style="max-width: 150px;">
                </div>
                
                <h1 style="color: #fe6f6f; text-align: center; margin-bottom: 20px;">Welcome to Pawvot!</h1>
                
                <p style="font-size: 16px; line-height: 1.5; color: #333;">Hello ${name},</p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #333;">Thank you for joining the Pawvot family! We're thrilled to have you as part of our community of pet lovers.</p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #333;">At Pawvot, you can:</p>
                
                <ul style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 20px;">
                    <li>Find your perfect furry companion</li>
                    <li>Shop premium pet supplies and accessories</li>
                    <li>Connect with other pet enthusiasts</li>
                    <li>Learn about pet care and adoption</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${config.CLIENT_URL}/products" style="background-color: #fe6f6f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Explore Products</a>
                    <a href="${config.CLIENT_URL}/pets" style="background-color: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Find Pets</a>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5; color: #333;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <p style="font-size: 16px; line-height: 1.5; color: #333;">Wags and purrs,</p>
                <p style="font-size: 16px; line-height: 1.5; color: #333; font-weight: bold;">The Pawvot Team</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; color: #999; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Pawvot. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
            `;
        }
        
        return sendEmail({
            to: email,
            subject: 'Welcome to Pawvot!',
            text: `Hi ${name}, Welcome to Pawvot! We're excited to have you join our community of pet lovers.`,
            html
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
        // Don't throw the error to prevent disrupting registration flow
        return null;
    }
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendBookingConfirmationEmail,
    sendWelcomeEmail
}; 