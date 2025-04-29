const Pet = require('../Models/Pet');
const Breed = require('../Models/Breed');
const { fetchDogImages, fetchCatImages, processDogData, processCatData } = require('./apiHelper');
const axios = require('axios');
const config = require('../config');
const mongoose = require('mongoose');
const Product = require('../Models/Product');
const Order = require('../Models/Order');

/**
 * Initialize database with pets and breeds
 */
const initializeDatabase = async () => {
    try {
        console.log('Initializing database...');
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
            console.log('Creating sample products...');
            await createSampleProducts();
            console.log('Sample products created');
        }
    } catch (error) {
        console.error('Error checking products:', error);
    }
};

/**
 * Create sample products for testing
 */
const createSampleProducts = async () => {
    const sampleProducts = [
        {
            name: 'Premium Dog Food',
            description: 'High quality dog food with balanced nutrition for all breeds.',
            price: 49.99,
            images: ['dog-food.jpg'],
            category: 'food',
            petType: ['dog'],
            brand: 'Happy Paws',
            countInStock: 50,
            featured: true
        },
        {
            name: 'Cat Scratching Post',
            description: 'Sturdy cat scratching post with sisal rope and comfortable perch.',
            price: 29.99,
            images: ['cat-post.jpg'],
            category: 'accessories',
            petType: ['cat'],
            brand: 'Feline Fun',
            countInStock: 30,
            featured: true
        },
        {
            name: 'Dog Chew Toy',
            description: 'Durable chew toy for dogs that helps clean teeth and gums.',
            price: 12.99,
            images: ['dog-toy.jpg'],
            category: 'toys',
            petType: ['dog'],
            brand: 'Pup Play',
            countInStock: 100,
            featured: false
        },
        {
            name: 'Cat Litter Box',
            description: 'Enclosed litter box with odor control and easy cleaning access.',
            price: 39.99,
            images: ['litter-box.jpg'],
            category: 'litter',
            petType: ['cat'],
            brand: 'Feline Fun',
            countInStock: 25,
            featured: false
        },
        {
            name: 'Pet Shampoo',
            description: 'Gentle pet shampoo for dogs and cats with sensitive skin.',
            price: 14.99,
            images: ['pet-shampoo.jpg'],
            category: 'grooming',
            petType: ['dog', 'cat'],
            brand: 'Pet Care',
            countInStock: 75,
            featured: true
        },
        {
            name: 'Pet Carrier',
            description: 'Comfortable and secure pet carrier for travel.',
            price: 59.99,
            images: ['pet-carrier.jpg'],
            category: 'carriers',
            petType: ['dog', 'cat', 'small_pet'],
            brand: 'Travel Pets',
            countInStock: 20,
            featured: false
        }
    ];
    
    await Product.insertMany(sampleProducts);
};

module.exports = {
    initializeDatabase
}; 