const axios = require('axios');
const config = require('../config');

/**
 * Fetch random dog images with breed information
 * @param {number} limit - Number of images to fetch
 * @returns {Promise<Array>} Array of dog images with breed data
 */
const fetchDogImages = async (limit = 10) => {
    try {
        const response = await axios.get(
            `${config.DOG_API_ENDPOINT}/images/search?size=med&mime_types=jpg&format=json&has_breeds=true&limit=${limit}`,
            {
                headers: {
                    'x-api-key': config.DOG_API_KEY
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching dog images:', error);
        throw error;
    }
};

/**
 * Fetch random cat images with breed information
 * @param {number} limit - Number of images to fetch
 * @returns {Promise<Array>} Array of cat images with breed data
 */
const fetchCatImages = async (limit = 10) => {
    try {
        const response = await axios.get(
            `${config.CAT_API_ENDPOINT}/images/search?size=med&mime_types=jpg&format=json&has_breeds=true&limit=${limit}`,
            {
                headers: {
                    'x-api-key': config.CAT_API_KEY
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching cat images:', error);
        throw error;
    }
};

/**
 * Process dog data from API to match our model
 * @param {Object} dogData - Raw dog data from API
 * @returns {Object} Processed dog data
 */
const processDogData = (dogData) => {
    // If no breeds in the response, provide default values
    if (!dogData.breeds || dogData.breeds.length === 0) {
        return {
            type: 'Dog',
            name: generatePetName('Dog'),
            breed: 'Mixed Breed',
            age: generateRandomAge(),
            location: generateRandomLocation(),
            image: dogData.url,
            imageId: dogData.id,
            description: 'A lovely dog looking for a forever home!'
        };
    }

    const breed = dogData.breeds[0];
    return {
        type: 'Dog',
        name: generatePetName('Dog'),
        breed: breed.name || 'Mixed Breed',
        age: generateRandomAge(),
        location: generateRandomLocation(),
        image: dogData.url,
        imageId: dogData.id,
        description: breed.temperament ? 
            `A ${breed.temperament.toLowerCase()} dog looking for a forever home!` : 
            'A lovely dog looking for a forever home!'
    };
};

/**
 * Process cat data from API to match our model
 * @param {Object} catData - Raw cat data from API
 * @returns {Object} Processed cat data
 */
const processCatData = (catData) => {
    // If no breeds in the response, provide default values
    if (!catData.breeds || catData.breeds.length === 0) {
        return {
            type: 'Cat',
            name: generatePetName('Cat'),
            breed: 'Mixed Breed',
            age: generateRandomAge(),
            location: generateRandomLocation(),
            image: catData.url,
            imageId: catData.id,
            description: 'A lovely cat looking for a forever home!'
        };
    }

    const breed = catData.breeds[0];
    return {
        type: 'Cat',
        name: generatePetName('Cat'),
        breed: breed.name || 'Mixed Breed',
        age: generateRandomAge(),
        location: generateRandomLocation(),
        image: catData.url,
        imageId: catData.id,
        description: breed.temperament ? 
            `A ${breed.temperament.toLowerCase()} cat looking for a forever home!` : 
            'A lovely cat looking for a forever home!'
    };
};

/**
 * Generate a random pet name
 * @param {string} type - Type of pet (Dog or Cat)
 * @returns {string} Random pet name
 */
const generatePetName = (type) => {
    const dogNames = [
        'Max', 'Buddy', 'Charlie', 'Jack', 'Cooper', 'Rocky', 'Toby', 'Tucker',
        'Jake', 'Bear', 'Duke', 'Teddy', 'Oliver', 'Riley', 'Bailey', 'Bentley',
        'Milo', 'Buster', 'Cody', 'Murphy', 'Winston', 'Leo', 'Lucky'
    ];
    
    const catNames = [
        'Luna', 'Bella', 'Lucy', 'Kitty', 'Lily', 'Nala', 'Chloe', 'Stella',
        'Zoe', 'Lola', 'Gracie', 'Mia', 'Sophie', 'Cleo', 'Willow', 'Daisy',
        'Mittens', 'Pepper', 'Shadow', 'Smokey', 'Tiger', 'Molly', 'Jasmine'
    ];
    
    const names = type === 'Dog' ? dogNames : catNames;
    return names[Math.floor(Math.random() * names.length)];
};

/**
 * Generate a random age for a pet
 * @returns {string} Random age
 */
const generateRandomAge = () => {
    const years = Math.floor(Math.random() * 12) + 1;
    return years === 1 ? '1 year' : `${years} years`;
};

/**
 * Generate a random location for a pet
 * @returns {string} Random location in Lebanon
 */
const generateRandomLocation = () => {
    const locations = [
        'Baabda', 'Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Jounieh',
        'Zahle', 'Byblos', 'Batroun', 'Nabatieh', 'Aley', 'Chouf',
        'Keserwan', 'Metn', 'Ashrafiye', 'Sin El Fil', 'Dbayeh', 'Dekwaneh'
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
};

module.exports = {
    fetchDogImages,
    fetchCatImages,
    processDogData,
    processCatData
}; 