const express = require('express');
const router = express.Router();
const Product = require('../Models/Product');
const Pet = require('../Models/Pet');
const mongoose = require('mongoose');

/**
 * @route GET /api/search
 * @desc Search across products and pets using natural language queries
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const query = q.toLowerCase().trim();

    // Process query to extract key information
    const extractedInfo = processSearchQuery(query);

    // Search products
    let productResults = await searchProducts(extractedInfo);

    // Search pets
    let petResults = await searchPets(extractedInfo);

    // Decide which results to prioritize based on the query
    let responseType = 'mixed';
    if (extractedInfo.isPetRelated && !extractedInfo.isProductRelated) {
      responseType = 'pets';
    } else if (extractedInfo.isProductRelated && !extractedInfo.isPetRelated) {
      responseType = 'products';
    }

    res.json({
      responseType,
      products: productResults,
      pets: petResults
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search operation' });
  }
});

/**
 * Process search query to extract key information
 * @param {string} query - User's search query
 * @returns {Object} Extracted information
 */
function processSearchQuery(query) {
  const result = {
    keywords: [],
    isPetRelated: false,
    isProductRelated: false,
    priceRange: { min: null, max: null },
    locations: [],
    petTypes: [],
    breeds: [],
    categories: [],
    originalQuery: query
  };

  // Common pet-related terms
  const petTerms = ['dog', 'cat', 'puppy', 'kitten', 'pet', 'adopt', 'adoption', 'breed'];
  
  // Common pet breeds
  const dogBreeds = ['labrador', 'german shepherd', 'golden retriever', 'bulldog', 'poodle', 'beagle', 'rottweiler', 'husky', 'chihuahua'];
  const catBreeds = ['persian', 'siamese', 'ragdoll', 'maine coon', 'bengal', 'sphynx', 'british shorthair', 'abyssinian'];
  
  // Common product-related terms
  const productTerms = ['food', 'toy', 'treats', 'collar', 'bed', 'leash', 'medicine', 'shop', 'buy', 'product'];
  
  // Product categories
  const productCategories = ['food', 'toy', 'medicine', 'accessory', 'grooming', 'treats'];
  
  // Common locations in Lebanon
  const locations = ['beirut', 'tripoli', 'sidon', 'tyre', 'jounieh', 'byblos', 'baalbek', 'zahle', 'aley', 'nabatieh', 'ashrafieh', 'dekwaneh'];
  
  // Check for pet-related terms
  result.isPetRelated = petTerms.some(term => query.includes(term));
  
  // Check for product-related terms
  result.isProductRelated = productTerms.some(term => query.includes(term));

  // Extract keywords (words with 3+ characters)
  result.keywords = query.split(/\s+/).filter(word => word.length >= 3);
  
  // Check for dog or cat
  if (query.includes('dog') || query.includes('puppy')) {
    result.petTypes.push('dog');
  }
  if (query.includes('cat') || query.includes('kitten')) {
    result.petTypes.push('cat');
  }
  
  // Check for breeds
  dogBreeds.forEach(breed => {
    if (query.includes(breed)) {
      result.breeds.push(breed);
    }
  });
  
  catBreeds.forEach(breed => {
    if (query.includes(breed)) {
      result.breeds.push(breed);
    }
  });
  
  // Check for locations
  locations.forEach(location => {
    if (query.includes(location)) {
      result.locations.push(location);
    }
  });
  
  // Check for product categories
  productCategories.forEach(category => {
    if (query.includes(category)) {
      result.categories.push(category);
    }
  });
  
  // Check for price information
  const priceMatch = query.match(/(\d+)(?:\s*-\s*(\d+))?(?:\s*\$|\$\s*)/);
  if (priceMatch) {
    if (priceMatch[1] && priceMatch[2]) {
      // Range like "10-50$"
      result.priceRange.min = parseInt(priceMatch[1]);
      result.priceRange.max = parseInt(priceMatch[2]);
    } else if (priceMatch[1] && query.includes('less than')) {
      // "less than 50$"
      result.priceRange.max = parseInt(priceMatch[1]);
    } else if (priceMatch[1] && query.includes('more than')) {
      // "more than 50$"
      result.priceRange.min = parseInt(priceMatch[1]);
    } else if (priceMatch[1]) {
      // Just a number with $ sign
      if (query.includes('under') || query.includes('below')) {
        result.priceRange.max = parseInt(priceMatch[1]);
      } else if (query.includes('over') || query.includes('above')) {
        result.priceRange.min = parseInt(priceMatch[1]);
      } else {
        // Exact price not very useful for search, use as approximate
        const price = parseInt(priceMatch[1]);
        result.priceRange.min = Math.max(0, price * 0.8);
        result.priceRange.max = price * 1.2;
      }
    }
  }

  return result;
}

/**
 * Search products based on extracted information
 * @param {Object} info - Extracted search information
 * @returns {Array} Matching products
 */
async function searchProducts(info) {
  const query = {};
  
  // Build search query
  if (info.categories.length > 0) {
    query.category = { $in: info.categories.map(c => new RegExp(c, 'i')) };
  }
  
  // Price range
  if (info.priceRange.min !== null || info.priceRange.max !== null) {
    query.price = {};
    if (info.priceRange.min !== null) {
      query.price.$gte = info.priceRange.min;
    }
    if (info.priceRange.max !== null) {
      query.price.$lte = info.priceRange.max;
    }
  }
  
  // Text search for name and description
  const textSearchTerms = [...info.keywords];
  const textSearchQuery = textSearchTerms.join(' ');
  
  try {
    let products;
    if (textSearchTerms.length > 0) {
      // Use $text search if possible
      products = await Product.find(
        { 
          $and: [
            query,
            { 
              $or: [
                { name: { $regex: textSearchQuery, $options: 'i' } },
                { description: { $regex: textSearchQuery, $options: 'i' } },
                { category: { $regex: textSearchQuery, $options: 'i' } },
              ]
            }
          ]
        }
      ).limit(20);
    } else {
      products = await Product.find(query).limit(20);
    }
    
    return products;
  } catch (err) {
    console.error('Error searching products:', err);
    return [];
  }
}

/**
 * Search pets based on extracted information
 * @param {Object} info - Extracted search information
 * @returns {Array} Matching pets
 */
async function searchPets(info) {
  const query = {};
  
  // Pet type filter
  if (info.petTypes.length > 0) {
    query.animalType = { $in: info.petTypes.map(type => new RegExp(type, 'i')) };
  }
  
  // Breed filter
  if (info.breeds.length > 0) {
    query.breed = { $in: info.breeds.map(breed => new RegExp(breed, 'i')) };
  }
  
  // Location filter
  if (info.locations.length > 0) {
    query.location = { $in: info.locations.map(location => new RegExp(location, 'i')) };
  }
  
  // Text search for name and description
  const textSearchTerms = [...info.keywords];
  const textSearchQuery = textSearchTerms.join(' ');
  
  try {
    let pets;
    if (textSearchTerms.length > 0) {
      // Use regex search
      pets = await Pet.find(
        { 
          $and: [
            query,
            { 
              $or: [
                { name: { $regex: textSearchQuery, $options: 'i' } },
                { description: { $regex: textSearchQuery, $options: 'i' } },
                { breed: { $regex: textSearchQuery, $options: 'i' } },
                { location: { $regex: textSearchQuery, $options: 'i' } }
              ]
            }
          ]
        }
      ).limit(20);
    } else {
      pets = await Pet.find(query).limit(20);
    }
    
    return pets;
  } catch (err) {
    console.error('Error searching pets:', err);
    return [];
  }
}

module.exports = router; 