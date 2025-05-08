const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    verifiedPurchase: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// A user can only review a product once
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method to calculate average rating for a product
reviewSchema.statics.calculateAverageRating = async function(productId) {
    const result = await this.aggregate([
        {
            $match: { product: productId }
        },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                numReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        if (result.length > 0) {
            const Product = mongoose.model('Product');
            await Product.findByIdAndUpdate(productId, {
                rating: result[0].averageRating.toFixed(1),
                numReviews: result[0].numReviews
            });
        } else {
            // No reviews, reset to default
            const Product = mongoose.model('Product');
            await Product.findByIdAndUpdate(productId, {
                rating: 0,
                numReviews: 0
            });
        }
    } catch (err) {
        console.error('Error updating product rating:', err);
    }
};

// Call calculateAverageRating after saving or removing a review
reviewSchema.post('save', async function() {
    await this.constructor.calculateAverageRating(this.product);
});

reviewSchema.post('remove', async function() {
    await this.constructor.calculateAverageRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema); 