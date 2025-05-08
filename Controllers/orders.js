const express = require('express');
const router = express.Router();
const Order = require('../Models/Order');
const Product = require('../Models/Product');
const mongoose = require('mongoose');
const { protect, admin } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/emailService');
const User = require('../Models/User');

/**
 * @route POST /api/orders
 * @desc Create a new order
 * @access Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { 
      items,
      shippingAddress, 
      paymentMethod
    } = req.body;

    // Validate input
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // Process order items and verify products exist
    const orderItems = await Promise.all(items.map(async (item) => {
      try {
        // Verify that the product exists
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }

        // Verify stock availability
        if (product.countInStock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        // Return the order item with product price
        return {
          product: item.product,
          quantity: item.quantity,
          price: product.price
        };
      } catch (error) {
        console.error(`Error processing order item ${item.product}:`, error);
        throw error;
      }
    }));

    // Create new order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod
    });

    // Save the order (pre-save middleware will calculate prices)
    const createdOrder = await order.save();
    
    // Update product inventory
    await Promise.all(orderItems.map(async (item) => {
      try {
        const product = await Product.findById(item.product);
        if (product) {
          product.countInStock = Math.max(0, product.countInStock - item.quantity);
          await product.save();
        }
      } catch (err) {
        console.error(`Error updating inventory for product ${item.product}:`, err);
      }
    }));
    
    // Populate product details for the response
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate({
        path: 'items.product',
        select: 'name images category'
      });
    
    // Send confirmation email
    try {
      const user = await User.findById(req.user._id);
      if (user && user.email) {
        await sendOrderConfirmationEmail(
          user.email, 
          user.name || 'Valued Customer', 
          populatedOrder
        );
        console.log(`Order confirmation email sent to ${user.email}`);
      }
    } catch (emailError) {
      // Don't fail the order creation if email fails
      console.error('Error sending order confirmation email:', emailError);
    }
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route GET /api/orders/:id
 * @desc Get order by ID
 * @access Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name images category'
      });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if order belongs to user or user is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this order' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/orders
 * @desc Get all orders for current user
 * @access Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/orders/admin/all
 * @desc Get all orders (admin only)
 * @access Private/Admin
 */
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name images'
      })
      .sort({ createdAt: -1 });
      
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/orders/:id/pay
 * @desc Update order to paid
 * @access Private
 */
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check user authorization
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Handle cash on delivery - no payment result needed
    if (req.body.paymentMethod === 'cash-on-delivery') {
      order.paymentMethod = 'cash-on-delivery';
      order.status = 'processing';
      
      const updatedOrder = await order.save();
      
      const populatedOrder = await Order.findById(updatedOrder._id)
        .populate('user', 'name email')
        .populate({
          path: 'items.product',
          select: 'name images'
        });
      
      return res.status(200).json(populatedOrder);
    }
    
    // Regular payment processing
    const { paymentResult } = req.body;
    
    if (!paymentResult) {
      return res.status(400).json({ message: 'Payment result is required for credit card payments' });
    }
    
    const updatedOrder = await order.markAsPaid(paymentResult);
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name images'
      });
    
    // Send payment confirmation email
    try {
      const user = await User.findById(req.user._id);
      if (user && user.email) {
        await sendOrderConfirmationEmail(
          user.email, 
          user.name || 'Valued Customer', 
          populatedOrder
        );
        console.log(`Payment confirmation email sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
    }
    
    res.status(200).json(populatedOrder);
  } catch (error) {
    console.error('Error updating order payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/orders/:id/status
 * @desc Update order status (admin only)
 * @access Private/Admin
 */
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const updatedOrder = await order.updateOrderStatus(status);
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name images'
      });
    
    res.status(200).json(populatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/orders/:id/cancel
 * @desc Cancel order
 * @access Private
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only allow cancellation if user owns the order or is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Only allow cancellation if order is not delivered yet
    if (order.isDelivered) {
      return res.status(400).json({ message: 'Cannot cancel a delivered order' });
    }
    
    const cancelledOrder = await order.cancelOrder();
    
    const populatedOrder = await Order.findById(cancelledOrder._id)
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name images'
      });
    
    res.status(200).json(populatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/orders/dashboard/stats
 * @desc Get order statistics for dashboard (admin only)
 * @access Private/Admin
 */
router.get('/dashboard/stats', protect, admin, async (req, res) => {
  try {
    // Get order stats
    const totalOrders = await Order.countDocuments();
    const totalSales = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    // Get order status counts
    const orderStatusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');
    
    // Format status counts into an object
    const statusCounts = {};
    orderStatusCounts.forEach(status => {
      statusCounts[status._id] = status.count;
    });
    
    res.status(200).json({
      totalOrders,
      totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
      statusCounts,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 