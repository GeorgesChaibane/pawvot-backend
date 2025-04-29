const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    }
});

const ShippingAddressSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    postalCode: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    }
});

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [OrderItemSchema],
    shippingAddress: ShippingAddressSchema,
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Credit Card', 'PayPal', 'Cash On Delivery']
    },
    paymentResult: {
        id: String,
        status: String,
        update_time: String,
        email_address: String
    },
    itemsPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    taxPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false
    },
    paidAt: {
        type: Date
    },
    isDelivered: {
        type: Boolean,
        required: true,
        default: false
    },
    deliveredAt: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Processing'
    },
    trackingNumber: {
        type: String
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Calculate total order price
OrderSchema.pre('save', function(next) {
    if (this.isModified('orderItems') || this.isNew) {
        // Calculate items price
        this.itemsPrice = this.orderItems.reduce(
            (acc, item) => acc + item.price * item.quantity, 
            0
        ).toFixed(2);
        
        // Calculate tax (assuming 10% tax)
        this.taxPrice = (this.itemsPrice * 0.1).toFixed(2);
        
        // Calculate shipping (free shipping over $100)
        this.shippingPrice = this.itemsPrice > 100 ? 0 : 10;
        
        // Calculate total
        this.totalPrice = (
            Number(this.itemsPrice) + 
            Number(this.taxPrice) + 
            Number(this.shippingPrice)
        ).toFixed(2);
    }
    next();
});

// Virtual for order progress percentage
OrderSchema.virtual('progressPercentage').get(function() {
    const statusMap = {
        'Processing': 25,
        'Shipped': 50,
        'Delivered': 100,
        'Cancelled': 0
    };
    
    return statusMap[this.status] || 0;
});

// Virtual for calculating total items in order
OrderSchema.virtual('totalItems').get(function() {
    return this.orderItems.reduce((total, item) => total + item.quantity, 0);
});

// Add index for faster queries
OrderSchema.index({ user: 1, createdAt: -1 });

// Update order status
OrderSchema.methods.updateOrderStatus = function(status) {
    this.status = status;
    
    if (status === 'Delivered') {
        this.isDelivered = true;
        this.deliveredAt = Date.now();
    }
    
    return this.save();
};

// Mark order as paid
OrderSchema.methods.markAsPaid = function(paymentResult) {
    this.isPaid = true;
    this.paidAt = Date.now();
    this.paymentResult = paymentResult;
    this.status = 'Processing';
    
    return this.save();
};

// Update inventory after order placement
OrderSchema.methods.updateInventory = async function() {
    const Product = mongoose.model('Product');
    
    // Reduce inventory for each item in the order
    for (const item of this.orderItems) {
        await Product.updateInventory(item.product, item.quantity);
    }
};

// Cancel order and restore inventory
OrderSchema.methods.cancelOrder = async function() {
    if (this.status !== 'Cancelled') {
        this.status = 'Cancelled';
        
        // Restore inventory if order was not delivered
        if (!this.isDelivered) {
            const Product = mongoose.model('Product');
            
            for (const item of this.orderItems) {
                await Product.updateInventory(item.product, item.quantity, true);
            }
        }
        
        await this.save();
    }
    
    return this;
};

module.exports = mongoose.model('Order', OrderSchema); 