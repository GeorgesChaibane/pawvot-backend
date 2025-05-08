require('dotenv').config();

module.exports = {
    // Server configuration
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // MongoDB configuration
    MONGO_URI: process.env.MONGO_URI,
    
    // JWT configuration
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '1h',
    JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || 1,
    
    // Email configuration
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
    EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM || 'support@pawvot.com',
    
    // Google OAuth configuration
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    
    // Client URL
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000'
}; 