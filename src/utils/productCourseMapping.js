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
 * @param {string} productName - Optional Shopify product name to help identify bundle products
 * @returns {string|null} LearnWorlds course ID or null if not found
 */
function getCourseIdForProduct(productId, productName = '') {
  // First try direct mapping
  const directCourseId = productToCourseMap[productId];
  if (directCourseId) return directCourseId;
  
  // If product name is provided and contains 'bundle', try to find a matching LearnWorlds course
  if (productName && productName.toLowerCase().includes('bundle')) {
    console.log(`Product ${productId} (${productName}) identified as a bundle product`);
    // You could implement additional logic here to find the correct LearnWorlds course ID
    // based on the bundle product name
    
    // For example, you might have a naming convention or a separate mapping
    // This is a placeholder for your custom mapping logic
    const bundleCourseId = findBundleCourseIdByName(productName);
    if (bundleCourseId) return bundleCourseId;
  }
  
  return null;
}

// Define the path to the bundle name mapping file
const BUNDLE_NAME_MAPPING_FILE_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/bundle_name_mapping.json'  // Use /tmp in production (Vercel)
  : path.join(__dirname, '../../data/bundle_name_mapping.json');

// Load the bundle name mapping from file or initialize if it doesn't exist
function loadBundleNameMapping() {
  ensureDirectoryExists();
  try {
    if (fs.existsSync(BUNDLE_NAME_MAPPING_FILE_PATH)) {
      const data = fs.readFileSync(BUNDLE_NAME_MAPPING_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading bundle-name mapping:', error);
  }
  return {}; // Return empty mapping if file doesn't exist or there's an error
}

// Save the bundle name mapping to file
function saveBundleNameMapping(mapping) {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(BUNDLE_NAME_MAPPING_FILE_PATH, JSON.stringify(mapping, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving bundle-name mapping:', error);
  }
}

// Initialize the bundle name mapping
let bundleNameToIdMap = loadBundleNameMapping();

/**
 * Find a LearnWorlds bundle course ID by product name
 * This is a helper function to map Shopify bundle product names to LearnWorlds course IDs
 * @param {string} productName - Shopify product name
 * @returns {string|null} LearnWorlds course ID or null if not found
 */
function findBundleCourseIdByName(productName) {
  // Normalize the product name (lowercase, remove special characters)
  const normalizedName = productName.toLowerCase().trim();
  
  // Check if we have a direct mapping for this product name
  if (bundleNameToIdMap[normalizedName]) {
    console.log(`Found LearnWorlds course ID for bundle: ${productName} -> ${bundleNameToIdMap[normalizedName]}`);
    return bundleNameToIdMap[normalizedName];
  }
  
  // Try to find a partial match (if the product name contains a key in our mapping)
  for (const [bundleName, courseId] of Object.entries(bundleNameToIdMap)) {
    if (normalizedName.includes(bundleName.toLowerCase())) {
      console.log(`Found partial match for bundle: ${productName} -> ${courseId} (matched with ${bundleName})`);
      return courseId;
    }
  }
  
  console.log(`No LearnWorlds course ID found for bundle: ${productName}`);
  return null;
}

/**
 * Set a mapping between a Shopify bundle product name and a LearnWorlds course ID
 * @param {string} bundleName - Shopify bundle product name
 * @param {string} courseId - LearnWorlds course ID
 */
function setBundleNameMapping(bundleName, courseId) {
  // Normalize the bundle name
  const normalizedName = bundleName.toLowerCase().trim();
  bundleNameToIdMap[normalizedName] = courseId;
  saveBundleNameMapping(bundleNameToIdMap);
}

/**
 * Remove a bundle name-to-course mapping
 * @param {string} bundleName - Shopify bundle product name
 */
function removeBundleNameMapping(bundleName) {
  const normalizedName = bundleName.toLowerCase().trim();
  delete bundleNameToIdMap[normalizedName];
  saveBundleNameMapping(bundleNameToIdMap);
}

/**
 * Get all bundle name-to-course mappings
 * @returns {Object} All bundle name mappings
 */
function getAllBundleNameMappings() {
  // Reload from file to ensure we have the latest data
  bundleNameToIdMap = loadBundleNameMapping();
  return { ...bundleNameToIdMap };
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
  getAllBundleMappings,
  findBundleCourseIdByName,
  setBundleNameMapping,
  removeBundleNameMapping,
  getAllBundleNameMappings
};