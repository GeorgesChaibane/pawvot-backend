const Pet = require('../Models/Pet');
const Breed = require('../Models/Breed');
const { fetchDogImages, fetchCatImages, processDogData, processCatData } = require('./apiHelper');
const axios = require('axios');
const config = require('../config');
const mongoose = require('mongoose');
const Product = require('../Models/Product');
const Order = require('../Models/Order');
const { seedProducts } = require('./productSeeder');
const { copyProductImages } = require('./copyImages');

/**
 * Initialize database with pets and breeds
 */
const initializeDatabase = async () => {
    try {
        console.log('Initializing database...');
        
        // Copy product images from client to server public folder
        await copyProductImages();
        
        // Sync data from APIs and seed database
        await syncBreeds();
        await syncPets();
        await ensureProductsExist();
        
        console.log('Database initialization complete!');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

/**
 * Sync breeds from APIs
 */
const syncBreeds = async () => {
    try {
        console.log('Syncing breeds...');
        
        // Sync dog breeds
        const dogResponse = await axios.get(
            `${config.DOG_API_ENDPOINT}/breeds`,
            {
                headers: {
                    'x-api-key': config.DOG_API_KEY
                }
            }
        );
        
        const dogBreeds = dogResponse.data;
        
        for (const breedData of dogBreeds) {
            const breedToSave = {
                name: breedData.name,
                petType: 'Dog',
                description: breedData.bred_for || '',
                temperament: breedData.temperament || '',
                lifeSpan: breedData.life_span || '',
                weight: {
                    imperial: breedData.weight?.imperial || '',
                    metric: breedData.weight?.metric || ''
                },
                height: {
                    imperial: breedData.height?.imperial || '',
                    metric: breedData.height?.metric || ''
                },
                origin: breedData.origin || '',
                referenceImageId: breedData.reference_image_id || '',
                apiId: breedData.id || null
            };
            
            // Check if the breed already exists
            const existingBreed = await Breed.findOne({ name: breedData.name, petType: 'Dog' });
            
            if (existingBreed) {
                // Update existing breed
                await Breed.findByIdAndUpdate(existingBreed._id, breedToSave);
            } else {
                // Create new breed
                const newBreed = new Breed(breedToSave);
                await newBreed.save();
            }
        }
        
        // Sync cat breeds
        const catResponse = await axios.get(
            `${config.CAT_API_ENDPOINT}/breeds`,
            {
                headers: {
                    'x-api-key': config.CAT_API_KEY
                }
            }
        );
        
        const catBreeds = catResponse.data;
        
        for (const breedData of catBreeds) {
            const breedToSave = {
                name: breedData.name,
                petType: 'Cat',
                description: breedData.description || '',
                temperament: breedData.temperament || '',
                lifeSpan: breedData.life_span || '',
                weight: {
                    imperial: breedData.weight?.imperial || '',
                    metric: breedData.weight?.metric || ''
                },
                origin: breedData.origin || '',
                referenceImageId: breedData.reference_image_id || '',
                apiId: breedData.id || null
            };
            
            // Check if the breed already exists
            const existingBreed = await Breed.findOne({ name: breedData.name, petType: 'Cat' });
            
            if (existingBreed) {
                // Update existing breed
                await Breed.findByIdAndUpdate(existingBreed._id, breedToSave);
            } else {
                // Create new breed
                const newBreed = new Breed(breedToSave);
                await newBreed.save();
            }
        }
        
        console.log('Breeds synced successfully!');
    } catch (error) {
        console.error('Error syncing breeds:', error);
    }
};

/**
 * Sync pets from APIs
 */
const syncPets = async () => {
    try {
        console.log('Syncing pets...');
        
        // Check if we already have pets in the database
        const existingPetsCount = await Pet.countDocuments();
        
        if (existingPetsCount > 0) {
            console.log(`Found ${existingPetsCount} existing pets. Skipping pet sync.`);
            return;
        }
        
        // Sync dogs
        const dogsData = await fetchDogImages(20);
        
        for (const dogData of dogsData) {
            const processedDog = processDogData(dogData);
            
            // Check if the dog with this imageId already exists
            const existingDog = await Pet.findOne({ imageId: processedDog.imageId });
            
            if (!existingDog) {
                // Create new dog
                const newDog = new Pet(processedDog);
                await newDog.save();
            }
        }
        
        // Sync cats
        const catsData = await fetchCatImages(20);
        
        for (const catData of catsData) {
            const processedCat = processCatData(catData);
            
            // Check if the cat with this imageId already exists
            const existingCat = await Pet.findOne({ imageId: processedCat.imageId });
            
            if (!existingCat) {
                // Create new cat
                const newCat = new Pet(processedCat);
                await newCat.save();
            }
        }
        
        console.log('Pets synced successfully!');
    } catch (error) {
        console.error('Error syncing pets:', error);
    }
};

/**
 * Ensure products exist in the database
 */
const ensureProductsExist = async () => {
    try {
        console.log('Checking products...');
        
        // Check if products collection exists and has items
        const productCount = await Product.countDocuments();
        console.log(`Found ${productCount} existing products`);
        
        if (productCount === 0) {
            console.log('No products found. Seeding product data...');
            
            // Instead of using sample products, use the product seeder
            // that includes our product data with proper image paths
            const { seedProducts } = require('./productSeeder');
            
            // Call the seedProducts function but don't disconnect from MongoDB
            // since we're in the middle of initializing the database
            try {
                // Delete any existing products (just to be safe)
                await Product.deleteMany({});
                
                // Get the seed data without connecting/disconnecting
                const { productSeedData } = require('./productSeeder');
                
                // Insert the seed data
                await Product.insertMany(productSeedData);
                console.log(`${productSeedData.length} products seeded successfully`);
            } catch (error) {
                console.error('Error seeding products:', error);
            }
        }
    } catch (error) {
        console.error('Error checking products:', error);
    }
};

// Export the functions
module.exports = {
    initializeDatabase,
    syncBreeds,
    syncPets,
    ensureProductsExist
}; 