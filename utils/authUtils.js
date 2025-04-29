const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

/**
 * Generate a random token
 * @returns {string} Random token
 */
const generateRandomToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRE
    });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null if verification fails
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Generate email verification token
 * @returns {object} Token object with token, hashedToken and expiry
 */
const generateEmailVerificationToken = () => {
    const token = generateRandomToken();
    const hashedToken = hashToken(token);
    
    // Token expires in 24 hours
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    return { token, hashedToken, expiry };
};

/**
 * Generate password reset token
 * @returns {object} Token object with token, hashedToken and expiry
 */
const generatePasswordResetToken = () => {
    const token = generateRandomToken();
    const hashedToken = hashToken(token);
    
    // Token expires in 1 hour
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    
    return { token, hashedToken, expiry };
};

/**
 * Hash a token
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    generateRandomToken,
    generateToken,
    verifyToken,
    generateEmailVerificationToken,
    generatePasswordResetToken,
    hashToken
}; 