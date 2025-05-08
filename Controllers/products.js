const express = require('express');
const router = express.Router();
const Product = require('../Models/Product');
const mongoose = require('mongoose');
const { protect, admin } = require('../middleware/auth');

/**
 * @route GET /api/products
 * @desc Get all products
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/products/featured
 * @desc Get featured products
 * @access Public
 */
router.get('/featured', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ 
      isActive: true,
      featured: true 
    }).limit(6);
    
    res.status(200).json(featuredProducts);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/products/:id
 * @desc Get product by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/products/category/:category
 * @desc Get products by category
 * @access Public
 */
router.get('/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ 
      category: req.params.category.toLowerCase(),
      isActive: true
    });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/products/pet/:petType
 * @desc Get products by pet type
 * @access Public
 */
router.get('/pet/:petType', async (req, res) => {
  try {
    const petType = req.params.petType.toLowerCase();
    
    const products = await Product.find({ 
      petType: { $in: [petType, 'all'] },
      isActive: true
    });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products by pet type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/products
 * @desc Create a product
 * @access Private/Admin
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      discount,
      images,
      category,
      petType,
      brand,
      countInStock,
      weight,
      dimensions,
      tags
    } = req.body;
    
    const product = new Product({
      name,
      description,
      price,
      originalPrice,
      discount,
      images,
      category,
      petType,
      brand,
      countInStock,
      weight,
      dimensions,
      tags
    });
    
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/products/:id
 * @desc Update a product
 * @access Private/Admin
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update product fields
    Object.keys(req.body).forEach(key => {
      product[key] = req.body[key];
    });
    
    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 * @access Private/Admin
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Instead of deleting, set isActive to false
    product.isActive = false;
    await product.save();
    
    res.status(200).json({ message: 'Product removed' });
  } catch (error) {
    console.error('Error removing product:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/products/:id/reviews
 * @desc Create a product review
 * @access Private
 */
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user already reviewed this product
    const alreadyReviewed = product.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );
    
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed' });
    }
    
    const reviewData = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment
    };
    
    await product.addReview(reviewData);
    
    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/products/search/:keyword
 * @desc Search products
 * @access Public
 */
router.get('/search/:keyword', async (req, res) => {
  try {
    const keyword = req.params.keyword;
    
    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { description: { $regex: keyword, $options: 'i' } },
            { brand: { $regex: keyword, $options: 'i' } },
            { tags: { $in: [new RegExp(keyword, 'i')] } }
          ]
        }
      ]
    });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/products/search
 * @desc Search products by query
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    const products = await Product.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { tags: searchRegex }
      ]
    }).sort({ createdAt: -1 });
    
    res.status(200).json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 