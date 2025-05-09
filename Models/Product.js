const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price must be at least 0']
  },
  originalPrice: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  images: {
    type: [String],
    default: ['default-product.jpg']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'food', 'Food',
      'treats', 'Treats',
      'toys', 'Toys',
      'accessories', 'Accessories',
      'grooming', 'Grooming',
      'health', 'Health',
      'litter', 'Litter',
      'beds', 'Beds',
      'carriers', 'Carriers',
      'clothing', 'Clothing',
      'training', 'Training',
      'medicines', 'Medicines',
      'other', 'Other'
    ]
  },
  petType: {
    type: [String],
    required: [true, 'Please specify which pet type this product is for'],
    enum: ['dog', 'cat', 'bird', 'fish', 'small_pet', 'all']
  },
  brand: {
    type: String,
    required: [true, 'Please add a brand name']
  },
  countInStock: {
    type: Number,
    required: [true, 'Please add count in stock'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  reviews: [ReviewSchema],
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: []
  },
  weight: {
    value: {
      type: Number
    },
    unit: {
      type: String,
      enum: ['g', 'kg', 'lb', 'oz'],
      default: 'g'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    }
  },
  isActive: {
    type: Boolean,
    default: true
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

// Create product slug from the name
ProductSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  }
  next();
});

// Set discount price if original price and discount are provided
ProductSchema.pre('save', function(next) {
  if (this.originalPrice > 0 && this.discount > 0) {
    this.price = this.originalPrice - (this.originalPrice * (this.discount / 100));
  }
  next();
});

// Calculate average rating
ProductSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    this.numReviews = this.reviews.length;
    const totalRating = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.rating = totalRating / this.numReviews;
  }
  return this.save({ validateBeforeSave: false });
};

// Add a review
ProductSchema.methods.addReview = async function(reviewData) {
  // Check if user already reviewed
  const alreadyReviewed = this.reviews.find(
    review => review.user.toString() === reviewData.user.toString()
  );

  if (alreadyReviewed) {
    throw new Error('Product already reviewed by this user');
  }

  this.reviews.push(reviewData);
  await this.calculateAverageRating();
  return this;
};

// Update a review
ProductSchema.methods.updateReview = async function(userId, reviewData) {
  const reviewIndex = this.reviews.findIndex(
    review => review.user.toString() === userId.toString()
  );

  if (reviewIndex === -1) {
    throw new Error('Review not found');
  }

  // Update the review
  this.reviews[reviewIndex] = {
    ...this.reviews[reviewIndex].toObject(),
    ...reviewData,
    date: Date.now()
  };

  await this.calculateAverageRating();
  return this;
};

// Remove a review
ProductSchema.methods.removeReview = async function(userId) {
  this.reviews = this.reviews.filter(
    review => review.user.toString() !== userId.toString()
  );
  
  await this.calculateAverageRating();
  return this;
};

// Update inventory when a product is ordered
ProductSchema.statics.updateInventory = async function(productId, quantity, increase = false) {
  const product = await this.findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (increase) {
    // Increase inventory (for order cancellations)
    product.countInStock += quantity;
  } else {
    // Decrease inventory (for new orders)
    if (product.countInStock < quantity) {
      throw new Error(`Insufficient stock for product: ${product.name}`);
    }
    product.countInStock -= quantity;
  }
  
  return product.save();
};

// Virtual for checking if product is in stock
ProductSchema.virtual('inStock').get(function() {
  return this.countInStock > 0;
});

// Index for faster searches
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
ProductSchema.index({ category: 1, petType: 1, price: 1, rating: -1 });

module.exports = mongoose.model('Product', ProductSchema); 