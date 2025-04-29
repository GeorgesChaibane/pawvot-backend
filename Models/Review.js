const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    pet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet'
    },
    rating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure that either product or pet is provided, but not both
reviewSchema.pre('validate', function(next) {
    if ((this.product && this.pet) || (!this.product && !this.pet)) {
        next(new Error('A review must be associated with either a product or a pet, but not both'));
    } else {
        next();
    }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 