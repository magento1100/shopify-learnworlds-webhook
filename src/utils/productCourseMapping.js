/**
 * Utility for mapping Shopify products to LearnWorlds courses
 */
const fs = require('fs');
const path = require('path');

// Define the path to the mapping file
const MAPPING_FILE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/product_course_mapping.json'  // Use /tmp in production (Vercel)
  : path.join(__dirname, '../../data/product_course_mapping.json');

// Ensure the directory exists
function ensureDirectoryExists() {
  if (process.env.NODE_ENV !== 'production') {
    const dir = path.dirname(MAPPING_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Load the mapping from file or initialize if it doesn't exist
function loadMapping() {
  ensureDirectoryExists();
  try {
    if (fs.existsSync(MAPPING_FILE_PATH)) {
      const data = fs.readFileSync(MAPPING_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading product-course mapping:', error);
  }
  return {}; // Return empty mapping if file doesn't exist or there's an error
}

// Save the mapping to file
function saveMapping(mapping) {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(MAPPING_FILE_PATH, JSON.stringify(mapping, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving product-course mapping:', error);
  }
}

// Initialize the mapping
let productToCourseMap = loadMapping();

/**
 * Get the LearnWorlds course ID for a given Shopify product ID
 * @param {string} productId - Shopify product ID
 * @returns {string|null} LearnWorlds course ID or null if not found
 */
function getCourseIdForProduct(productId) {
  return productToCourseMap[productId] || null;
}

/**
 * Add or update a product-to-course mapping
 * @param {string} productId - Shopify product ID
 * @param {string} courseId - LearnWorlds course ID
 */
function setProductCourseMapping(productId, courseId) {
  productToCourseMap[productId] = courseId;
  saveMapping(productToCourseMap);
}

/**
 * Remove a product-to-course mapping
 * @param {string} productId - Shopify product ID
 */
function removeProductCourseMapping(productId) {
  delete productToCourseMap[productId];
  saveMapping(productToCourseMap);
}

/**
 * Get all product-to-course mappings
 * @returns {Object} All mappings
 */
function getAllMappings() {
  // Reload from file to ensure we have the latest data
  productToCourseMap = loadMapping();
  return { ...productToCourseMap };
}

module.exports = {
  getCourseIdForProduct,
  setProductCourseMapping,
  removeProductCourseMapping,
  getAllMappings
};