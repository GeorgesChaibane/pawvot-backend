const Product = require('../Models/Product');
const mongoose = require('mongoose');
const config = require('../config');

// Product seed data with all the available images
const productSeedData = [
  // Cat Food
  {
    name: 'Purina Fancy Feast Grilled Wet Cat Food',
    description: 'Gourmet wet cat food with delicious grilled chicken flavor. Rich in protein and essential nutrients for your feline friend.',
    price: 24.99,
    category: 'food',
    petType: 'cat',
    brand: 'Purina',
    countInStock: 50,
    featured: true,
    discount: 10,
    isActive: true,
    rating: 4.7,
    images: ['/images/food/cat/purina fancy feast grilled wet cat.webp'],
    tags: ['cat food', 'wet food', 'gourmet', 'purina']
  },
  {
    name: 'Purina Fancy Feast Wet Cat Food - Seafood Collection',
    description: 'Premium wet cat food with a variety of seafood flavors. Made with real seafood and essential nutrients.',
    price: 29.99,
    category: 'food',
    petType: 'cat',
    brand: 'Purina',
    countInStock: 35,
    featured: false,
    discount: 0,
    isActive: true,
    rating: 4.5,
    images: ['/images/food/cat/purina fancy feast wet cat.webp'],
    tags: ['cat food', 'wet food', 'seafood', 'purina']
  },
  
  // Dog Food
  {
    name: 'Cesar Filet Mignon Steak Flavor Dog Food',
    description: 'Gourmet dog food with delicious filet mignon steak flavor. Perfect for small to medium-sized dogs.',
    price: 32.99,
    category: 'food',
    petType: 'dog',
    brand: 'Cesar',
    countInStock: 45,
    featured: true,
    discount: 5,
    isActive: true,
    rating: 4.8,
    images: ['/images/food/dog/Cesar steak dog.webp'],
    tags: ['dog food', 'gourmet', 'steak', 'cesar']
  },
  {
    name: 'Purina Pro Plan Adult Dog Food',
    description: 'High-quality dog food for adult dogs. Rich in protein and essential nutrients for active dogs.',
    price: 45.99,
    category: 'food',
    petType: 'dog',
    brand: 'Purina',
    countInStock: 30,
    featured: false,
    discount: 0,
    isActive: true,
    rating: 4.6,
    images: ['/images/food/dog/purina pro plan.jpeg'],
    tags: ['dog food', 'adult', 'purina']
  },
  {
    name: 'Rachael Ray Nutrish Premium Dog Food',
    description: 'Premium natural dog food made with real ingredients. No artificial flavors or preservatives.',
    price: 39.99,
    category: 'food',
    petType: 'dog',
    brand: 'Rachael Ray Nutrish',
    countInStock: 25,
    featured: true,
    discount: 15,
    isActive: true,
    rating: 4.5,
    images: ['/images/food/dog/rachael ray.webp'],
    tags: ['dog food', 'natural', 'premium']
  },
  
  // Cat Toys
  {
    name: 'Interactive Ball Catch Game for Cats',
    description: 'Interactive toy that keeps your cat entertained for hours. Stimulates natural hunting instincts.',
    price: 14.99,
    category: 'toys',
    petType: 'cat',
    brand: 'PetPlay',
    countInStock: 40,
    featured: false,
    discount: 0,
    isActive: true,
    rating: 4.3,
    images: ['/images/toys/cat toy ball catch game.webp'],
    tags: ['cat toy', 'interactive', 'ball']
  },
  {
    name: 'Colorful Ball Toy for Cats',
    description: 'Colorful ball toy that rolls and bounces unpredictably. Perfect for active cats who love to chase.',
    price: 9.99,
    category: 'toys',
    petType: 'cat',
    brand: 'PetFun',
    countInStock: 60,
    featured: true,
    discount: 0,
    isActive: true,
    rating: 4.2,
    images: ['/images/toys/cat toy ball.webp'],
    tags: ['cat toy', 'ball', 'chase']
  },
  
  // Dog Toys
  {
    name: 'Multipet Bouncing Ball - For Dogs and Cats',
    description: 'Durable bouncing ball suitable for both dogs and cats. Made from non-toxic materials that are safe for chewing.',
    price: 12.99,
    category: 'toys',
    petType: ['dog', 'cat'],
    brand: 'Multipet',
    countInStock: 55,
    featured: false,
    discount: 0,
    isActive: true,
    rating: 4.4,
    images: ['/images/toys/dog ball works with cat too.webp'],
    tags: ['dog toy', 'cat toy', 'ball', 'durable']
  },
  {
    name: 'Playology Chew Stick for Dogs',
    description: 'Scented chew stick that keeps dogs engaged longer. Helps clean teeth and reduce plaque.',
    price: 16.99,
    category: 'toys',
    petType: 'dog',
    brand: 'Playology',
    countInStock: 35,
    featured: true,
    discount: 10,
    isActive: true,
    rating: 4.6,
    images: ['/images/toys/playology chew stick dog.webp'],
    tags: ['dog toy', 'chew toy', 'dental']
  },
  
  // Cat Medicines
  {
    name: 'Cat Heart & Immune System Supplements',
    description: 'Support your cat\'s heart health and immune system with these easy-to-administer supplements.',
    price: 29.99,
    category: 'health',
    petType: 'cat',
    brand: 'PetHealth',
    countInStock: 20,
    featured: false,
    discount: 0,
    isActive: true,
    rating: 4.7,
    images: ['/images/medicines/cat/Cat Heart Supplements - Immune.jpeg'],
    tags: ['cat medicine', 'supplements', 'heart health', 'immune support']
  },
  {
    name: 'Pet Stomach Relief Supplements for Cats',
    description: 'Helps soothe upset stomachs and improves digestive health for cats with sensitive digestive systems.',
    price: 24.99,
    category: 'health',
    petType: 'cat',
    brand: 'PetHealth',
    countInStock: 25,
    featured: true,
    discount: 5,
    isActive: true,
    rating: 4.5,
    images: ['/images/medicines/cat/PET SUPPLEMENTS Stomach Relief.jpeg'],
    tags: ['cat medicine', 'supplements', 'stomach relief', 'digestive health']
  },
  
  // Dog Medicines
  {
    name: 'PetArmor 7-Way De-Wormer for Dogs',
    description: 'Effective treatment that helps eliminate 7 types of worms in dogs. Easy to administer.',
    price: 34.99,
    category: 'health',
    petType: 'dog',
    brand: 'PetArmor',
    countInStock: 15,
    featured: false,
    discount: 0,
    isActive: true,
    rating: 4.6,
    images: ['/images/medicines/dog/Petarmor 7 Way De-Wormer For.jpeg'],
    tags: ['dog medicine', 'dewormer', 'treatment']
  },
  {
    name: 'PetArmor Antihistamine for Dogs',
    description: 'Provides relief from allergies and itching. Helps dogs with seasonal allergies or skin irritations.',
    price: 27.99,
    category: 'health',
    petType: 'dog',
    brand: 'PetArmor',
    countInStock: 18,
    featured: true,
    discount: 0,
    isActive: true,
    rating: 4.4,
    images: ['/images/medicines/dog/Petarmor Antihistamine.jpeg'],
    tags: ['dog medicine', 'antihistamine', 'allergy relief']
  },
  
  // Accessories
  {
    name: 'Premium Cat Scratching Post',
    description: 'Durable cat scratching post that helps protect your furniture. Made with high-quality sisal rope.',
    price: 49.99,
    category: 'accessories',
    petType: 'cat',
    brand: 'PetComfort',
    countInStock: 12,
    featured: true,
    discount: 15,
    isActive: true,
    rating: 4.8,
    images: ['/images/accessories/cat scratching post.jpeg'],
    tags: ['cat accessories', 'scratching post', 'furniture protection']
  }
];

// Function to seed products
const seedProducts = async () => {
  try {
    // Connect to MongoDB (use a direct connection string for testing)
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pawvot';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    
    // Delete existing products (optional)
    await Product.deleteMany({});
    console.log('Existing products deleted');
    
    // Insert new products
    const createdProducts = await Product.insertMany(productSeedData);
    console.log(`${createdProducts.length} products inserted successfully`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    console.log('Product seeding completed successfully');
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

// Export the seeder function
module.exports = {
  seedProducts,
  productSeedData
};

// Allow running directly from command line
if (require.main === module) {
  seedProducts()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Error running seeder:', error);
      process.exit(1);
    });
} 