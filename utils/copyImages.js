const fs = require('fs');
const path = require('path');

// Paths
const clientImagesPath = path.join(__dirname, '../../client/src/assets/images');
const serverPublicImagesPath = path.join(__dirname, '../public/images');

// Create destination directory if it doesn't exist
if (!fs.existsSync(serverPublicImagesPath)) {
  fs.mkdirSync(serverPublicImagesPath, { recursive: true });
}

// Create necessary subdirectories
const subdirectories = [
  'food/dog',
  'food/cat',
  'toys',
  'medicines/dog',
  'medicines/cat',
  'accessories'
];

for (const subdir of subdirectories) {
  const fullPath = path.join(serverPublicImagesPath, subdir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * Copy files from a source directory to a destination directory
 * @param {string} sourceDir - Source directory path
 * @param {string} destDir - Destination directory path
 */
const copyFiles = (sourceDir, destDir) => {
  if (!fs.existsSync(sourceDir)) {
    console.log(`Source directory does not exist: ${sourceDir}`);
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceDir);
  
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyFiles(sourcePath, destPath);
    } else if (stats.isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied: ${sourcePath} -> ${destPath}`);
    }
  }
};

/**
 * Main function to copy all product images
 */
const copyAllProductImages = () => {
  console.log('Starting image copy process...');

  // Copy food images
  const foodSourceDir = path.join(clientImagesPath, 'food');
  if (fs.existsSync(foodSourceDir)) {
    const foodDestDir = path.join(serverPublicImagesPath, 'food');
    copyFiles(foodSourceDir, foodDestDir);
  }

  // Copy toy images
  const toysSourceDir = path.join(clientImagesPath, 'toys');
  if (fs.existsSync(toysSourceDir)) {
    const toysDestDir = path.join(serverPublicImagesPath, 'toys');
    copyFiles(toysSourceDir, toysDestDir);
  }

  // Copy medicine images
  const medicinesSourceDir = path.join(clientImagesPath, 'medicines');
  if (fs.existsSync(medicinesSourceDir)) {
    const medicinesDestDir = path.join(serverPublicImagesPath, 'medicines');
    copyFiles(medicinesSourceDir, medicinesDestDir);
  }
  
  // Copy accessories images
  const accessoriesSourceDir = path.join(clientImagesPath, 'accessories');
  if (fs.existsSync(accessoriesSourceDir)) {
    const accessoriesDestDir = path.join(serverPublicImagesPath, 'accessories');
    copyFiles(accessoriesSourceDir, accessoriesDestDir);
  }

  console.log('Image copy process completed.');
};

// Run the copy function
copyAllProductImages();

// Export the function
module.exports = {
  copyAllProductImages
};

// If the script is run directly
if (require.main === module) {
  copyAllProductImages();
} 