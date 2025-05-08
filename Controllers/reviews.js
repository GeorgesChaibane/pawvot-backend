const express = require('express');
const router = express.Router();
const Review = require('../Models/Review');
const Product = require('../Models/Product');
const Order = require('../Models/Order');
const { protect } = require('../middleware/auth');

/**
 * @route POST /api/reviews/product/:productId
 * @desc Create a new product review
 * @access Private
 */
router.post('/product/:productId', protect, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const productId = req.params.productId;
    
    // Validate request body
    if (!rating || !title || !comment) {
      return res.status(400).json({ message: 'Please provide rating, title, and comment' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: productId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if user has purchased this product
    const hasOrdered = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      status: { $in: ['delivered', 'completed'] }
    });

    // Create review
    const review = new Review({
      user: req.user._id,
      product: productId,
      rating,
      title,
      comment,
      verifiedPurchase: !!hasOrdered
    });

    await review.save();

    // Populate user details for response
    await review.populate('user', 'firstName lastName');

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reviews/product/:productId
 * @desc Get all reviews for a product
 * @access Public
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get reviews with user info
    const reviews = await Review.find({ product: productId })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reviews/user
 * @desc Get all reviews by the logged in user
 * @access Private
 */
router.get('/user', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name image price')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/reviews/:reviewId
 * @desc Update a review
 * @access Private
 */
router.put('/:reviewId', protect, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    
    // Validate request body
    if (!rating && !title && !comment) {
      return res.status(400).json({ message: 'Please provide at least one field to update' });
    }
    
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find review
    const review = await Review.findById(req.params.reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Update review
    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;

    const updatedReview = await review.save();
    await updatedReview.populate('user', 'firstName lastName');
    
    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/reviews/:reviewId
 * @desc Delete a review
 * @access Private
 */
router.delete('/:reviewId', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if user owns the review or is admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    // Store product ID for recalculating rating after deletion
    const productId = review.product;
    
    await review.remove();
    
    res.json({ message: 'Review removed' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/reviews/check/:productId
 * @desc Check if user has already reviewed a product and if they can review it
 * @access Private
 */
router.get('/check/:productId', protect, async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user has purchased the product
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      status: { $in: ['delivered', 'completed'] }
    });
    
    // Check if user has already reviewed the product
    const hasReviewed = await Review.findOne({
      user: req.user._id,
      product: productId
    });
    
    res.json({
      canReview: !!hasPurchased && !hasReviewed,
      hasReviewed: !!hasReviewed,
      hasPurchased: !!hasPurchased
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 