const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const { initializeDatabase } = require('./utils/dbHelper');

// Import routes
const petRoutes = require('./Controllers/pets');
const breedRoutes = require('./Controllers/breeds');
const productRoutes = require('./Controllers/products');
const orderRoutes = require('./Controllers/orders');
const authRoutes = require('./Controllers/auth');

const app = express();

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// Use routes
app.use('/api/pets', petRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);

// Base route for API status
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the PawVot API', status: 'up and running' });
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
