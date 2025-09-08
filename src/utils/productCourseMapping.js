/**
 * Utility for mapping Shopify products to LearnWorlds courses
 * Supports direct mapping of all product types including bundle products
 */
const fs = require('fs');
const path = require('path');

// Define the path to the mapping file
const MAPPING_FILE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/product_course_mapping.json'  // Use /tmp in production (Vercel)
  : path.join(__dirname, '../../data/product_course_mapping.json');

// Define the path to the bundle mapping file
const BUNDLE_MAPPING_FILE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/bundle_product_mapping.json'  // Use /tmp in production (Vercel)
  : path.join(__dirname, '../../data/bundle_product_mapping.json');

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

// Load the bundle mapping from file or initialize if it doesn't exist
function loadBundleMapping() {
  ensureDirectoryExists();
  try {
    if (fs.existsSync(BUNDLE_MAPPING_FILE_PATH)) {
      const data = fs.readFileSync(BUNDLE_MAPPING_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading bundle-product mapping:', error);
  }
  return {}; // Return empty mapping if file doesn't exist or there's an error
}

// Save the bundle mapping to file
function saveBundleMapping(mapping) {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(BUNDLE_MAPPING_FILE_PATH, JSON.stringify(mapping, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving bundle-product mapping:', error);
  }
}

// Initialize the mappings
let productToCourseMap = loadMapping();
let bundleToComponentsMap = loadBundleMapping();

/**
 * Get the LearnWorlds course ID for a given Shopify product ID
 * Works for all product types including bundle products
 * @param {string} productId - Shopify product ID (can be a regular product or bundle product)
 * @returns {string|null} LearnWorlds course ID or null if not found
 */
function getCourseIdForProduct(productId) {
  return productToCourseMap[productId] || null;
}

/**
 * Add or update a product-to-course mapping
 * Works for all product types including bundle products
 * @param {string} productId - Shopify product ID (can be a regular product or bundle product)
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

/**
 * Get the component product IDs for a bundle product
 * @param {string} bundleProductId - Shopify bundle product ID
 * @returns {string[]} Array of component product IDs or empty array if not found
 */
function getBundleComponents(bundleProductId) {
  return bundleToComponentsMap[bundleProductId] || [];
}

/**
 * Add or update a bundle-to-components mapping
 * @param {string} bundleProductId - Shopify bundle product ID
 * @param {string[]} componentProductIds - Array of component product IDs
 */
function setBundleComponents(bundleProductId, componentProductIds) {
  bundleToComponentsMap[bundleProductId] = componentProductIds;
  saveBundleMapping(bundleToComponentsMap);
}

/**
 * Remove a bundle-to-components mapping
 * @param {string} bundleProductId - Shopify bundle product ID
 */
function removeBundleComponents(bundleProductId) {
  delete bundleToComponentsMap[bundleProductId];
  saveBundleMapping(bundleToComponentsMap);
}

/**
 * Get all bundle-to-components mappings
 * @returns {Object} All bundle mappings
 */
function getAllBundleMappings() {
  // Reload from file to ensure we have the latest data
  bundleToComponentsMap = loadBundleMapping();
  return { ...bundleToComponentsMap };
}

module.exports = {
  getCourseIdForProduct,
  setProductCourseMapping,
  removeProductCourseMapping,
  getAllMappings,
  getBundleComponents,
  setBundleComponents,
  removeBundleComponents,
  getAllBundleMappings
};