const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AddressSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please provide a full name for this address']
    },
    street: {
        type: String,
        required: [true, 'Street address is required']
    },
    city: {
        type: String,
        required: [true, 'City is required']
    },
    state: {
        type: String,
        required: [true, 'State/Province is required']
    },
    country: {
        type: String,
        required: [true, 'Country is required']
    },
    zipCode: {
        type: String,
        required: [true, 'Zip/Postal code is required']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required']
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        match: [
            /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId; // Password not required if signing in with Google
        },
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    googleId: {
        type: String
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    addresses: [AddressSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    cart: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            default: 1
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
    // Only run this if password was modified
    if (!this.isModified('password')) return next();
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification token
UserSchema.methods.generateVerificationToken = function() {
    // Generate token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to verificationToken field
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    // Set expire (24 hours)
    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    
    return verificationToken;
};

// Generate password reset token
UserSchema.methods.generateResetPasswordToken = function() {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // Set expire (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    return resetToken;
};

// Update last login timestamp
UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = Date.now();
    return this.save({ validateBeforeSave: false });
};

// Add a pet to favorites
UserSchema.methods.addFavorite = function(petId) {
    if (!this.favorites.includes(petId)) {
        this.favorites.push(petId);
    }
    return this.save();
};

// Remove a pet from favorites
UserSchema.methods.removeFavorite = function(petId) {
    this.favorites = this.favorites.filter(
        id => id.toString() !== petId.toString()
    );
    return this.save();
};

// Add product to cart
UserSchema.methods.addToCart = function(productId, quantity = 1) {
    const cartItemIndex = this.cart.findIndex(
        item => item.product.toString() === productId.toString()
    );

    if (cartItemIndex >= 0) {
        // Product exists in cart, update quantity
        this.cart[cartItemIndex].quantity += quantity;
    } else {
        // Add new product to cart
        this.cart.push({ product: productId, quantity });
    }

    return this.save();
};

// Remove product from cart
UserSchema.methods.removeFromCart = function(productId) {
    this.cart = this.cart.filter(
        item => item.product.toString() !== productId.toString()
    );
    return this.save();
};

// Update product quantity in cart
UserSchema.methods.updateCartItemQuantity = function(productId, quantity) {
    const cartItemIndex = this.cart.findIndex(
        item => item.product.toString() === productId.toString()
    );

    if (cartItemIndex >= 0) {
        this.cart[cartItemIndex].quantity = quantity;
    }

    return this.save();
};

// Clear cart
UserSchema.methods.clearCart = function() {
    this.cart = [];
    return this.save();
};

// Address management methods
UserSchema.methods.addAddress = function(addressData) {
    // If this is the first address or marked as default, set it as default
    if (this.addresses.length === 0 || addressData.isDefault) {
        // Set all existing addresses to non-default
        this.addresses.forEach(address => {
            address.isDefault = false;
        });
        addressData.isDefault = true;
    }
    
    this.addresses.push(addressData);
    return this.save();
};

UserSchema.methods.updateAddress = function(addressId, updatedData) {
    const addressIndex = this.addresses.findIndex(
        addr => addr._id.toString() === addressId.toString()
    );
    
    if (addressIndex >= 0) {
        // If marking as default, update other addresses
        if (updatedData.isDefault) {
            this.addresses.forEach(address => {
                address.isDefault = false;
            });
        }
        
        // Update the address with new data
        Object.keys(updatedData).forEach(key => {
            this.addresses[addressIndex][key] = updatedData[key];
        });
    }
    
    return this.save();
};

UserSchema.methods.removeAddress = function(addressId) {
    const wasDefault = this.addresses.find(
        addr => addr._id.toString() === addressId.toString()
    )?.isDefault;
    
    this.addresses = this.addresses.filter(
        addr => addr._id.toString() !== addressId.toString()
    );
    
    // If we removed the default address and have other addresses, set a new default
    if (wasDefault && this.addresses.length > 0) {
        this.addresses[0].isDefault = true;
    }
    
    return this.save();
};

UserSchema.methods.getDefaultAddress = function() {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

module.exports = mongoose.model('User', UserSchema); 