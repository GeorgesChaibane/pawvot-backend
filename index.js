const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initializeDatabase } = require('./utils/dbHelper');

// Import routes
const petRoutes = require('./Controllers/pets');
const breedRoutes = require('./Controllers/breeds');
const productRoutes = require('./Controllers/products');
const orderRoutes = require('./Controllers/orders');
const authRoutes = require('./Controllers/auth');
const userRoutes = require('./Controllers/users');
const bookingRoutes = require('./Controllers/bookings');
const reviewRoutes = require('./Controllers/reviews');
const searchRoutes = require('./Controllers/search');
const emailRoutes = require('./Controllers/email');

const app = express();

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Use routes
app.use('/api/pets', petRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/email', emailRoutes);

// Direct product filtering endpoint for troubleshooting
app.get('/api/products-filter', async (req, res) => {
  try {
    const { query, category, petType, minPrice, maxPrice, sort } = req.query;
    const Product = require('./Models/Product');
    
    // Log request parameters for debugging
    console.log('Direct product filter request:', {
      query, category, petType, minPrice, maxPrice, sort
    });
    
    // Build the search query object
    const searchQuery = {
      isActive: true
    };
    
    // If we have a text query, add regex search
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      searchQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { tags: searchRegex }
      ];
    }
    
    // Add category filter
    if (category) {
      searchQuery.category = new RegExp(category, 'i');
    }
    
    // Add pet type filter
    if (petType) {
      searchQuery.petType = typeof petType === 'string' ? 
        { $regex: petType, $options: 'i' } : 
        { $in: petType.map(type => new RegExp(type, 'i')) };
    }
    
    // Add price range
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) {
        searchQuery.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        searchQuery.price.$lte = parseFloat(maxPrice);
      }
    }
    
    // Prepare the sort options
    let sortOptions = { createdAt: -1 }; // Default sort by newest
    if (sort) {
      switch (sort) {
        case 'price-low-high':
          sortOptions = { price: 1 };
          break;
        case 'price-high-low':
          sortOptions = { price: -1 };
          break;
        case 'featured':
          sortOptions = { featured: -1, createdAt: -1 };
          break;
        // Keep the default for 'newest' and any unknown sort option
      }
    }
    
    console.log('MongoDB query:', JSON.stringify(searchQuery));
    console.log('Sort options:', sortOptions);
    
    // Execute the search query
    const products = await Product.find(searchQuery).sort(sortOptions);
    console.log(`Found ${products.length} products matching criteria`);
    
    // Always return a 200 response with the products (even if empty)
    return res.status(200).json(products);
  } catch (error) {
    console.error('Error in direct product filtering:', error);
    res.status(500).json({ message: 'Server error during product filtering' });
  }
});

// Base route for API status
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the PawVot API', status: 'up and running' });
});

// Diagnostics route to help debug route issues
app.get('/api/diagnostics/routes', (req, res) => {
  const getRoutes = (layer) => {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods)
        .filter(method => layer.route.methods[method])
        .map(method => method.toUpperCase());
      return { path, methods };
    }
    if (layer.name === 'router' && layer.handle.stack) {
      const path = layer.regexp.toString().replace('/^', '').replace('\\/?(?=\\/|$)/i', '');
      const routes = layer.handle.stack
        .map(getRoutes)
        .filter(Boolean)
        .map(route => ({
          path: path === '/' ? route.path : path + route.path,
          methods: route.methods
        }));
      return { routes };
    }
    return null;
  };

  const routes = app._router.stack
    .map(getRoutes)
    .filter(Boolean);
  
  res.json({
    routes,
    message: 'Active routes in the API'
  });
});

// 404 Not Found handler
app.use((req, res, next) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found', path: req.url });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

mongoose.connect(config.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Initialize database with data
        initializeDatabase()
            .then(() => {
                app.listen(config.PORT, () => {
                    console.log(`Server is running on port: ${config.PORT}`);
                });
            });
    })
    .catch((error) => console.log(error.message));
