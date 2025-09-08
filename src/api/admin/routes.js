const express = require('express');
const router = express.Router();
const { 
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
} = require('../../utils/productCourseMapping');

// Get all product-to-course mappings
router.get('/mappings', async (req, res) => {
  try {
    const mappings = getAllMappings();
    res.status(200).json({ success: true, mappings });
  } catch (error) {
    console.error('Error getting mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set a product-to-course mapping
router.post('/mappings', async (req, res) => {
  try {
    const { productId, courseId } = req.body;
    
    if (!productId || !courseId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    setProductCourseMapping(productId, courseId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a product-to-course mapping
router.delete('/mappings/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ error: 'Missing product ID' });
    }
    
    removeProductCourseMapping(productId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bundle-to-components mappings
router.get('/bundles', async (req, res) => {
  try {
    const mappings = getAllBundleMappings();
    res.status(200).json({ success: true, mappings });
  } catch (error) {
    console.error('Error getting bundle mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set a bundle-to-components mapping
router.post('/bundles', async (req, res) => {
  try {
    const { bundleProductId, componentProductIds } = req.body;
    
    if (!bundleProductId || !componentProductIds || !Array.isArray(componentProductIds)) {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }
    
    setBundleComponents(bundleProductId, componentProductIds);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting bundle mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a bundle-to-components mapping
router.delete('/bundles/:bundleProductId', async (req, res) => {
  try {
    const { bundleProductId } = req.params;
    
    if (!bundleProductId) {
      return res.status(400).json({ error: 'Missing bundle product ID' });
    }
    
    removeBundleComponents(bundleProductId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing bundle mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get components for a specific bundle product
router.get('/bundles/:bundleProductId', async (req, res) => {
  try {
    const { bundleProductId } = req.params;
    
    if (!bundleProductId) {
      return res.status(400).json({ error: 'Missing bundle product ID' });
    }
    
    const components = getBundleComponents(bundleProductId);
    res.status(200).json({ success: true, bundleProductId, components });
  } catch (error) {
    console.error('Error getting bundle components:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bundle name-to-course mappings
router.get('/bundle-names', async (req, res) => {
  try {
    const mappings = getAllBundleNameMappings();
    res.status(200).json({ success: true, mappings });
  } catch (error) {
    console.error('Error getting bundle name mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set a bundle name-to-course mapping
router.post('/bundle-names', async (req, res) => {
  try {
    const { bundleName, courseId } = req.body;
    
    if (!bundleName || !courseId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    setBundleNameMapping(bundleName, courseId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting bundle name mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a bundle name-to-course mapping
router.delete('/bundle-names/:bundleName', async (req, res) => {
  try {
    const { bundleName } = req.params;
    
    if (!bundleName) {
      return res.status(400).json({ error: 'Missing bundle name' });
    }
    
    removeBundleNameMapping(bundleName);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing bundle name mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find a course ID for a bundle by name
router.get('/bundle-names/find/:bundleName', async (req, res) => {
  try {
    const { bundleName } = req.params;
    
    if (!bundleName) {
      return res.status(400).json({ error: 'Missing bundle name' });
    }
    
    const courseId = findBundleCourseIdByName(bundleName);
    if (courseId) {
      res.status(200).json({ success: true, bundleName, courseId });
    } else {
      res.status(404).json({ success: false, message: 'No course ID found for this bundle name' });
    }
  } catch (error) {
    console.error('Error finding course ID for bundle name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;