const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = nodemailer.createTransport({
    service: config.EMAIL_SERVICE,
    auth: {
        user: config.EMAIL_USERNAME,
        pass: config.EMAIL_PASSWORD
    }
});

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
    const message = {
        from: `Pawvot <${config.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('Email sent: ', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Send a verification email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
    const verificationLink = `${config.CLIENT_URL}/verify-email?token=${token}`;
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e63946;">Welcome to Pawvot!</h1>
        </div>
        <div style="margin-bottom: 20px;">
            <p>Hi ${name},</p>
            <p>Thank you for registering with Pawvot! We're excited to have you join our community of pet lovers.</p>
            <p>Please verify your email address by clicking the button below:</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #e63946; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px;">
            <p>If you didn't create an account with us, please ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
            <p>If the button doesn't work, you can copy and paste the following link into your browser: ${verificationLink}</p>
        </div>
    </div>
    `;
    
    return sendEmail({
        to: email,
        subject: 'Verify Your Email | Pawvot',
        text: `Hi ${name}, Please verify your email address by clicking the following link: ${verificationLink}`,
        html
    });
};

/**
 * Send a password reset email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (email, name, token) => {
    const resetLink = `${config.CLIENT_URL}/reset-password?token=${token}`;
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e63946;">Reset Your Password</h1>
        </div>
        <div style="margin-bottom: 20px;">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your Pawvot account.</p>
            <p>Please click the button below to reset your password:</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #e63946; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px;">
            <p>If you didn't request this, please ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
            <p>If the button doesn't work, you can copy and paste the following link into your browser: ${resetLink}</p>
        </div>
    </div>
    `;
    
    return sendEmail({
        to: email,
        subject: 'Reset Your Password | Pawvot',
        text: `Hi ${name}, Please reset your password by clicking the following link: ${resetLink}`,
        html
    });
};

/**
 * Send order confirmation email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {Object} order - Order details
 */
const sendOrderConfirmationEmail = async (email, name, order) => {
    const orderLink = `${config.CLIENT_URL}/orders/${order._id}`;
    
    // Generate order items HTML
    let itemsHtml = '';
    order.orderItems.forEach(item => {
        itemsHtml += `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
        `;
    });
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e63946;">Order Confirmation</h1>
            <p style="color: #666;">Order #${order._id}</p>
        </div>
        <div style="margin-bottom: 20px;">
            <p>Hi ${name},</p>
            <p>Thank you for your order! We're processing it now and will ship your items soon.</p>
        </div>
        <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 10px; text-align: left;">Item</th>
                        <th style="padding: 10px; text-align: left;">Name</th>
                        <th style="padding: 10px; text-align: left;">Qty</th>
                        <th style="padding: 10px; text-align: left;">Price</th>
                        <th style="padding: 10px; text-align: left;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                        <td style="padding: 10px;">$${order.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Shipping:</td>
                        <td style="padding: 10px;">$${order.shippingPrice.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
                        <td style="padding: 10px; font-weight: bold;">$${order.totalPrice.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Shipping Information</h3>
            <p><strong>Name:</strong> ${order.shippingAddress.fullName}</p>
            <p><strong>Address:</strong> ${order.shippingAddress.address}</p>
            <p><strong>City:</strong> ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
            <p><strong>Phone:</strong> ${order.shippingAddress.phoneNumber}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${orderLink}" style="background-color: #e63946; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Order</a>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px; text-align: center;">
            <p>Thank you for shopping with Pawvot!</p>
            <p>If you have any questions, please contact our customer service at support@pawvot.com</p>
        </div>
    </div>
    `;
    
    return sendEmail({
        to: email,
        subject: `Order Confirmation #${order._id} | Pawvot`,
        text: `Hi ${name}, Thank you for your order! Your order #${order._id} has been received and is being processed.`,
        html
    });
};

/**
 * Send booking confirmation email
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {Object} booking - Booking details
 * @param {Object} pet - Pet details
 */
const sendBookingConfirmationEmail = async (email, name, booking, pet) => {
    const bookingDate = new Date(booking.visitDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #e63946;">Booking Confirmation</h1>
        </div>
        <div style="margin-bottom: 20px;">
            <p>Hi ${name},</p>
            <p>Your visit with ${pet.name} has been scheduled! We're looking forward to meeting you.</p>
        </div>
        <div style="margin-bottom: 20px; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
            <h3 style="color: #333; margin-top: 0;">Visit Details</h3>
            <p><strong>Pet:</strong> ${pet.name} (${pet.breed})</p>
            <p><strong>Date:</strong> ${bookingDate}</p>
            <p><strong>Time:</strong> ${booking.visitTime}</p>
            <p><strong>Location:</strong> Pawvot Adoption Center - ${pet.location} Branch</p>
        </div>
        <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">What to Expect</h3>
            <p>During your visit, you'll have the opportunity to meet ${pet.name} and interact with them in a comfortable environment. Our staff will be available to answer any questions you may have about adoption, pet care, and ${pet.name}'s specific needs.</p>
        </div>
        <div style="margin-bottom: 20px;">
            <h3 style="color: #333;">Before Your Visit</h3>
            <ul>
                <li>Arrive 10-15 minutes before your scheduled time</li>
                <li>Bring a valid ID</li>
                <li>Consider bringing family members who will be living with the pet</li>
            </ul>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px; text-align: center;">
            <p>If you need to reschedule or cancel your visit, please contact us at least 24 hours in advance.</p>
            <p>For any questions, please reach out to us at support@pawvot.com</p>
        </div>
    </div>
    `;
    
    return sendEmail({
        to: email,
        subject: `Booking Confirmation: Visit with ${pet.name} | Pawvot`,
        text: `Hi ${name}, Your visit with ${pet.name} has been scheduled for ${bookingDate} at ${booking.visitTime}. We're looking forward to meeting you!`,
        html
    });
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendBookingConfirmationEmail
}; 