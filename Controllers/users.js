const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const Product = require('../Models/Product');
const { protect, admin } = require('../middleware/auth');
const mongoose = require('mongoose');

/**
 * @route GET /api/users/cart
 * @desc Get items in user's cart
 * @access Private
 */
router.get('/cart', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'cart.product',
        select: 'name price images category countInStock'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format cart for response
    const cartItems = user.cart.map(item => {
      const product = item.product;
      if (!product) {
        return null; // Skip if product not found (might have been deleted)
      }
      
      return {
        productId: product._id,
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        price: product.price,
        category: product.category,
        countInStock: product.countInStock,
        quantity: item.quantity
      };
    }).filter(Boolean); // Remove null items
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/users/cart
 * @desc Add item to cart
 * @access Private
 */
router.post('/cart', protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    
    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.countInStock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Add to cart using the method from User model
    await user.addToCart(productId, quantity);
    
    // Get updated cart
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.product',
        select: 'name price images category countInStock'
      });
    
    // Format cart for response
    const cartItems = updatedUser.cart.map(item => {
      const product = item.product;
      if (!product) return null;
      
      return {
        productId: product._id,
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        price: product.price,
        category: product.category,
        countInStock: product.countInStock,
        quantity: item.quantity
      };
    }).filter(Boolean);
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/users/cart/:productId
 * @desc Update cart item quantity
 * @access Private
 */
router.put('/cart/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    
    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.countInStock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update cart item quantity
    await user.updateCartItemQuantity(productId, quantity);
    
    // Get updated cart
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.product',
        select: 'name price images category countInStock'
      });
    
    // Format cart for response
    const cartItems = updatedUser.cart.map(item => {
      const product = item.product;
      if (!product) return null;
      
      return {
        productId: product._id,
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        price: product.price,
        category: product.category,
        countInStock: product.countInStock,
        quantity: item.quantity
      };
    }).filter(Boolean);
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/users/cart/:productId
 * @desc Remove item from cart
 * @access Private
 */
router.delete('/cart/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove from cart
    await user.removeFromCart(productId);
    
    // Get updated cart
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.product',
        select: 'name price images category countInStock'
      });
    
    // Format cart for response
    const cartItems = updatedUser.cart.map(item => {
      const product = item.product;
      if (!product) return null;
      
      return {
        productId: product._id,
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        price: product.price,
        category: product.category,
        countInStock: product.countInStock,
        quantity: item.quantity
      };
    }).filter(Boolean);
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/users/cart
 * @desc Clear entire cart
 * @access Private
 */
router.delete('/cart', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clear cart
    await user.clearCart();
    
    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/users/cart/sync
 * @desc Sync cart items from request
 * @access Private
 */
router.put('/cart/sync', protect, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Items array is required' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clear existing cart
    user.cart = [];
    
    // Add each item to cart
    for (const item of items) {
      const { productId, quantity } = item;
      if (!productId || !quantity) continue;
      
      // Validate product exists
      const productExists = await Product.exists({ _id: productId });
      if (!productExists) continue;
      
      // Add to cart
      user.cart.push({
        product: productId,
        quantity: parseInt(quantity)
      });
    }
    
    // Save updated cart
    await user.save();
    
    // Get updated cart with populated products
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.product',
        select: 'name price images category countInStock'
      });
    
    // Format cart for response
    const cartItems = updatedUser.cart.map(item => {
      const product = item.product;
      if (!product) return null;
      
      return {
        productId: product._id,
        name: product.name,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        price: product.price,
        category: product.category,
        countInStock: product.countInStock,
        quantity: item.quantity
      };
    }).filter(Boolean);
    
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 