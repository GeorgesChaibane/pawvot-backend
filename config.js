require('dotenv').config();

// Configuration for APIs and other environment variables
module.exports = {
    // MongoDB connection string
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/pawvot',
    
    // API Keys
    DOG_API_KEY: process.env.DOG_API_KEY,
    CAT_API_KEY: process.env.CAT_API_KEY,
    
    // API Endpoints
    DOG_API_ENDPOINT: 'https://api.thedogapi.com/v1',
    CAT_API_ENDPOINT: 'https://api.thecatapi.com/v1',
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'pawvotsecret2023',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE,
    
    // Email
    EMAIL_SERVICE: process.env.EMAIL_SERVICE,
    EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
    
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    
    // Port for server
    PORT: process.env.PORT || 5000,
    
    // Client URL
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    
    // Node environment
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // URLs for server and client (used for image paths and links)
    SERVER_URL: process.env.SERVER_URL || 'http://localhost:5000'
}; 