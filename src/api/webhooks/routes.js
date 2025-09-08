const express = require('express');
const router = express.Router();
// Import Shopify API adapter first
require('@shopify/shopify-api/adapters/node');
const { shopifyApi } = require('@shopify/shopify-api');

// Create shopify instance
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_API_SCOPES?.split(',') || ['read_products', 'write_products'],
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost:3000',
  apiVersion: process.env.SHOPIFY_API_VERSION || '2023-10',
  isEmbeddedApp: true
});
const learnWorldsService = require('../../services/learnWorldsService');
const { getCourseIdForProduct } = require('../../utils/productCourseMapping');

// Middleware to verify Shopify webhook
const verifyShopifyWebhook = async (req, res, next) => {
  try {
    // Get the HMAC header
    const hmac = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmac) {
      return res.status(401).send('Unauthorized');
    }
    
    // Verify the webhook
    // Create a buffer from the request body
    const rawBody = JSON.stringify(req.body);
    const verified = shopify.webhooks.validate({
      rawBody: rawBody,
      rawRequest: req,
      rawResponse: res
    });
    
    if (!verified) {
      return res.status(401).send('Unauthorized');
    }
    
    next();
  } catch (error) {
    console.error('Webhook verification error:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Handle product subscription cancellation webhook
router.post('/product-subscription-cancelled', verifyShopifyWebhook, async (req, res) => {
  try {
    const { customer, product_id } = req.body;
    
    if (!customer || !product_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Processing unsubscription for customer ${customer.id} from product ${product_id}`);
    
    // Get the corresponding LearnWorlds course ID for this Shopify product
    const courseId = await getCourseIdForProduct(product_id);
    
    if (!courseId) {
      return res.status(404).json({ error: 'No matching course found for this product' });
    }
    
    // Unenroll the customer from the LearnWorlds course
    await learnWorldsService.unenrollUserFromCourse(customer.email, courseId);
    
    console.log(`Successfully unenrolled customer ${customer.id} from course ${courseId}`);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// No longer need the helper function as we're using the utility module

module.exports = router;