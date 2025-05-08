const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],
  shippingAddress: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
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
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Credit Card', 'PayPal', 'Cash On Delivery', 'credit-card', 'paypal', 'cash-on-delivery']
  },
  paymentResult: {
    id: { type: String },
    status: { type: String },
    update_time: { type: String },
    email_address: { type: String }
  },
  subtotal: {
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
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate prices
orderSchema.pre('save', async function(next) {
  if (!this.isModified('items')) return next();
  
  try {
    // Calculate subtotal
    this.subtotal = this.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    
    // Calculate tax - 11%
    this.taxPrice = this.subtotal * 0.11;
    
    // Shipping is free over $50
    this.shippingPrice = this.subtotal > 50 ? 0 : 7.99;
    
    // Calculate total
    this.totalPrice = this.subtotal + this.taxPrice + this.shippingPrice;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Mark order as paid
orderSchema.methods.markAsPaid = async function(paymentResult) {
  this.isPaid = true;
  this.paidAt = Date.now();
  this.paymentResult = paymentResult;
  
  if (this.status === 'pending') {
    this.status = 'processing';
  }
  
  return await this.save();
};

// Update order status
orderSchema.methods.updateOrderStatus = async function(newStatus) {
  this.status = newStatus;
  
  if (newStatus === 'shipped') {
    this.shippedAt = Date.now();
  } else if (newStatus === 'delivered') {
    this.isDelivered = true;
    this.deliveredAt = Date.now();
  }
  
  return await this.save();
};

// Cancel order
orderSchema.methods.cancelOrder = async function() {
  this.status = 'cancelled';
  this.cancelledAt = Date.now();
  
  // Restore product inventory
  for (const item of this.items) {
    const product = await mongoose.model('Product').findById(item.product);
    if (product) {
      product.countInStock += item.quantity;
      await product.save();
    }
  }
  
  return await this.save();
};

module.exports = mongoose.model('Order', orderSchema); 