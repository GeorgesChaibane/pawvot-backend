const express = require('express');
const router = express.Router();
const axios = require('axios');
const Breed = require('../Models/Breed');
const config = require('../config');

/**
 * @route GET /api/breeds
 * @desc Get all breeds
 * @access Public
 */
router.get('/', async (req, res) => {
    try {
        const breeds = await Breed.find().sort({ name: 1 });
        res.status(200).json(breeds);
    } catch (error) {
        console.error('Error fetching breeds:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/breeds/dogs
 * @desc Get all dog breeds
 * @access Public
 */
router.get('/dogs', async (req, res) => {
    try {
        const dogBreeds = await Breed.find({ petType: 'Dog' }).sort({ name: 1 });
        res.status(200).json(dogBreeds);
    } catch (error) {
        console.error('Error fetching dog breeds:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/breeds/cats
 * @desc Get all cat breeds
 * @access Public
 */
router.get('/cats', async (req, res) => {
    try {
        const catBreeds = await Breed.find({ petType: 'Cat' }).sort({ name: 1 });
        res.status(200).json(catBreeds);
    } catch (error) {
        console.error('Error fetching cat breeds:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/breeds/sync/dogs
 * @desc Sync dog breeds from The Dog API
 * @access Public
 */
router.get('/sync/dogs', async (req, res) => {
    try {
        const response = await axios.get(
            `${config.DOG_API_ENDPOINT}/breeds`,
            {
                headers: {
                    'x-api-key': config.DOG_API_KEY
                }
            }
        );
        
        const dogBreeds = response.data;
        
        const breedPromises = dogBreeds.map(async (breedData) => {
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
                return Breed.findByIdAndUpdate(existingBreed._id, breedToSave, { new: true });
            } else {
                // Create new breed
                const newBreed = new Breed(breedToSave);
                return newBreed.save();
            }
        });
        
        const savedBreeds = await Promise.all(breedPromises);
        res.status(200).json(savedBreeds);
    } catch (error) {
        console.error('Error syncing dog breeds:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/breeds/sync/cats
 * @desc Sync cat breeds from The Cat API
 * @access Public
 */
router.get('/sync/cats', async (req, res) => {
    try {
        const response = await axios.get(
            `${config.CAT_API_ENDPOINT}/breeds`,
            {
                headers: {
                    'x-api-key': config.CAT_API_KEY
                }
            }
        );
        
        const catBreeds = response.data;
        
        const breedPromises = catBreeds.map(async (breedData) => {
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
                return Breed.findByIdAndUpdate(existingBreed._id, breedToSave, { new: true });
            } else {
                // Create new breed
                const newBreed = new Breed(breedToSave);
                return newBreed.save();
            }
        });
        
        const savedBreeds = await Promise.all(breedPromises);
        res.status(200).json(savedBreeds);
    } catch (error) {
        console.error('Error syncing cat breeds:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/breeds/:id
 * @desc Get breed by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
    try {
        const breed = await Breed.findById(req.params.id);
        
        if (!breed) {
            return res.status(404).json({ message: 'Breed not found' });
        }
        
        res.status(200).json(breed);
    } catch (error) {
        console.error('Error fetching breed:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Breed not found' });
        }
        
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;