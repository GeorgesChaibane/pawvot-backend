const express = require('express');
const router = express.Router();
const Pet = require('../Models/Pet');
const mongoose = require('mongoose');
const { fetchDogImages, fetchCatImages, processDogData, processCatData } = require('../utils/apiHelper');

/**
 * @route GET /api/pets
 * @desc Get all pets
 * @access Public
 */
router.get('/', async (req, res) => {
    try {
        const pets = await Pet.find({}).sort({ createdAt: -1 });
        res.status(200).json(pets);
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/search
 * @desc Search pets by query
 * @access Public
 */
router.get('/search', async (req, res) => {
    try {
        const { query, type, breed, location, gender, minAge, maxAge } = req.query;
        
        // Log search request for debugging
        console.log('Pet search request:', {
            query, type, breed, location, gender, minAge, maxAge
        });
        
        // Build the search query object
        const searchQuery = {};
        
        // If we have a text query, add regex search
        if (query) {
            // Check if the query might be a location
            const isLocationQuery = !type && !breed && !location && !gender && !minAge && !maxAge;
            
            if (isLocationQuery) {
                // When searching only by query text and it might be a location,
                // prioritize location matching
                searchQuery.location = new RegExp(query, 'i');
                console.log(`Location-based search detected: ${query}`);
            } else {
                // Regular search with all fields
                const searchRegex = new RegExp(query, 'i');
                searchQuery.$or = [
                    { name: searchRegex },
                    { breed: searchRegex },
                    { type: searchRegex },
                    { location: searchRegex },
                    { description: searchRegex }
                ];
            }
        }
        
        // Add specific filters if provided
        if (type) {
            searchQuery.type = new RegExp(type, 'i');
        }
        
        if (breed) {
            searchQuery.breed = new RegExp(breed, 'i');
        }
        
        if (location) {
            searchQuery.location = new RegExp(location, 'i');
        }
        
        if (gender) {
            searchQuery.gender = new RegExp(gender, 'i');
        }
        
        // Handle age range
        if (minAge || maxAge) {
            searchQuery.age = {};
            if (minAge) {
                searchQuery.age.$gte = parseInt(minAge);
            }
            if (maxAge) {
                searchQuery.age.$lte = parseInt(maxAge);
            }
        }
        
        // Log the final query for debugging
        console.log('Pet search MongoDB query:', JSON.stringify(searchQuery));
        
        const pets = await Pet.find(searchQuery).sort({ createdAt: -1 });
        console.log(`Found ${pets.length} pets matching criteria`);
        
        res.status(200).json(pets);
    } catch (error) {
        console.error('Error searching pets:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/all
 * @desc Get all pets (for the See All Pets page)
 * @access Public
 */
router.get('/all', async (req, res) => {
    try {
        // Fetch up to 30 pets (15 dogs, 15 cats) including mixed breeds
        const dogs = await Pet.find({ 
            type: 'Dog'
        }).sort({ createdAt: -1 }).limit(15);
        
        const cats = await Pet.find({ 
            type: 'Cat'
        }).sort({ createdAt: -1 }).limit(15);
        
        // Combine dogs and cats
        const pets = [...dogs, ...cats];
        
        res.status(200).json(pets);
    } catch (error) {
        console.error('Error fetching all pets:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/dogs
 * @desc Get all dogs
 * @access Public
 */
router.get('/dogs', async (req, res) => {
    try {
        const dogs = await Pet.find({ 
            type: 'Dog'
        }).sort({ createdAt: -1 });
        
        res.status(200).json(dogs);
    } catch (error) {
        console.error('Error fetching dogs:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/cats
 * @desc Get all cats
 * @access Public
 */
router.get('/cats', async (req, res) => {
    try {
        const cats = await Pet.find({ 
            type: 'Cat'
        }).sort({ createdAt: -1 });
        
        res.status(200).json(cats);
    } catch (error) {
        console.error('Error fetching cats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/breeds
 * @desc Get unique breed values for filtering
 * @access Public
 */
router.get('/breeds', async (req, res) => {
    try {
        const breeds = await Pet.distinct('breed');
        res.status(200).json(breeds);
    } catch (error) {
        console.error('Error fetching breeds:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/locations
 * @desc Get unique location values for filtering
 * @access Public
 */
router.get('/locations', async (req, res) => {
    try {
        const locations = await Pet.distinct('location');
        res.status(200).json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/:id
 * @desc Get a pet by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if the ID is a valid MongoDB ObjectID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid pet ID format' });
        }
        
        const pet = await Pet.findById(id);
        
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        res.status(200).json(pet);
    } catch (error) {
        console.error('Error fetching pet:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/sync/dogs
 * @desc Sync dogs from API
 * @access Public
 */
router.get('/sync/dogs', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 30;
        const dogsData = await fetchDogImages(limit);
        
        const dogPromises = dogsData.map(async (dogData) => {
            // Skip mixed breeds and ensure image dimensions are consistent
            if (dogData.breeds && dogData.breeds.length > 0 && 
                dogData.breeds[0].name && 
                dogData.breeds[0].name.toLowerCase() !== 'mixed breed' &&
                dogData.width > 0 && dogData.height > 0 &&
                Math.abs(dogData.width / dogData.height - 1) < 0.3) { // Check for roughly square images
                
                const processedDog = processDogData(dogData);
                
                // Check if the dog with this imageId already exists
                const existingDog = await Pet.findOne({ imageId: processedDog.imageId });
                
                if (existingDog) {
                    return existingDog;
                }
                
                // Create new dog
                const newDog = new Pet(processedDog);
                return newDog.save();
            }
            return null;
        });
        
        const dogs = (await Promise.all(dogPromises)).filter(dog => dog !== null);
        res.status(200).json(dogs);
    } catch (error) {
        console.error('Error syncing dogs:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/sync/cats
 * @desc Sync cats from API
 * @access Public
 */
router.get('/sync/cats', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 30;
        const catsData = await fetchCatImages(limit);
        
        const catPromises = catsData.map(async (catData) => {
            // Ensure image dimensions are consistent but use a specific breed for all cats
            if (catData.width > 0 && catData.height > 0 &&
                Math.abs(catData.width / catData.height - 1) < 0.3) { // Check for roughly square images
                
                const processedCat = processCatData(catData);
                
                // Override the breed to be consistent for all cats
                processedCat.breed = 'Domestic Shorthair';
                
                // Check if the cat with this imageId already exists
                const existingCat = await Pet.findOne({ imageId: processedCat.imageId });
                
                if (existingCat) {
                    // Update existing cat to have the consistent breed
                    existingCat.breed = 'Domestic Shorthair';
                    return existingCat.save();
                }
                
                // Create new cat
                const newCat = new Pet(processedCat);
                return newCat.save();
            }
            return null;
        });
        
        const cats = (await Promise.all(catPromises)).filter(cat => cat !== null);
        res.status(200).json(cats);
    } catch (error) {
        console.error('Error syncing cats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/pets/update-cats
 * @desc Update all cats to have a consistent breed
 * @access Public (in production should be Private)
 */
router.get('/update-cats', async (req, res) => {
    try {
        // Update all cats to have the consistent breed
        const result = await Pet.updateMany(
            { type: 'Cat' }, 
            { $set: { breed: 'Domestic Shorthair' } }
        );
        
        res.status(200).json({ 
            message: 'All cats updated successfully', 
            updated: result.nModified 
        });
    } catch (error) {
        console.error('Error updating cats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/pets
 * @desc Create a new pet
 * @access Private/Admin
 */
router.post('/', async (req, res) => {
    try {
        const newPet = new Pet(req.body);
        const savedPet = await newPet.save();
        res.status(201).json(savedPet);
    } catch (error) {
        console.error('Error creating pet:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route PUT /api/pets/:id
 * @desc Update a pet
 * @access Private/Admin
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid pet ID format' });
        }
        
        const updatedPet = await Pet.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true }
        );
        
        if (!updatedPet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        res.status(200).json(updatedPet);
    } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route DELETE /api/pets/:id
 * @desc Delete a pet
 * @access Private/Admin
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid pet ID format' });
        }
        
        const deletedPet = await Pet.findByIdAndDelete(id);
        
        if (!deletedPet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        res.status(200).json({ message: 'Pet removed successfully' });
    } catch (error) {
        console.error('Error deleting pet:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 