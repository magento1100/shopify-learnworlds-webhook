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

// Handle order cancellation webhook (for subscription cancellations)
router.post('/orders/cancelled', verifyShopifyWebhook, async (req, res) => {
  try {
    const { id, customer, line_items, tags } = req.body;
    
    // Check if this order is related to a subscription (by checking tags)
    const isSubscription = tags && Array.isArray(tags) && 
      tags.some(tag => tag.toLowerCase().includes('subscription'));
    
    if (!isSubscription) {
      console.log(`Order ${id} cancelled but not a subscription, skipping LearnWorlds unenrollment`);
      return res.status(200).json({ success: true, message: 'Not a subscription order' });
    }
    
    if (!customer || !customer.email || !line_items || !line_items.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Processing subscription cancellation for order ${id}, customer ${customer.id}`);
    
    // Process each product in the order
    for (const item of line_items) {
      const product_id = item.product_id;
      if (!product_id) continue;
      
      // Get the corresponding LearnWorlds course ID for this Shopify product
      const courseId = await getCourseIdForProduct(product_id);
      
      if (!courseId) {
        console.log(`No matching course found for product ${product_id}`);
        continue;
      }
      
      // Unenroll the customer from the LearnWorlds course
      await learnWorldsService.unenrollUserFromCourse(customer.email, courseId);
      
      console.log(`Successfully unenrolled customer ${customer.id} from course ${courseId} due to subscription cancellation`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order cancellation webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle order creation webhook (for new subscriptions)
router.post('/orders/create', verifyShopifyWebhook, async (req, res) => {
  try {
    const { id, customer, line_items, tags, financial_status } = req.body;
    
    // Check if this order is related to a subscription (by checking tags)
    const isSubscription = tags && Array.isArray(tags) && 
      tags.some(tag => tag.toLowerCase().includes('subscription'));
    
    if (!isSubscription) {
      console.log(`Order ${id} created but not a subscription, skipping LearnWorlds enrollment`);
      return res.status(200).json({ success: true, message: 'Not a subscription order' });
    }
    
    // Only process paid or authorized orders
    if (financial_status !== 'paid' && financial_status !== 'authorized') {
      console.log(`Subscription order ${id} has financial status ${financial_status}, not processing until paid`);
      return res.status(200).json({ success: true, message: 'Order not paid yet' });
    }
    
    if (!customer || !customer.email || !line_items || !line_items.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Processing new subscription for order ${id}, customer ${customer.id}`);
    
    // Process each product in the order
    for (const item of line_items) {
      const product_id = item.product_id;
      if (!product_id) continue;
      
      // Get the corresponding LearnWorlds course ID for this Shopify product
      const courseId = await getCourseIdForProduct(product_id);
      
      if (!courseId) {
        console.log(`No matching course found for product ${product_id}`);
        continue;
      }
      
      // Create user data object for enrollment
      const userData = {
        email: customer.email,
        first_name: customer.first_name || '',
        last_name: customer.last_name || ''
      };
      
      // Enroll the customer in the LearnWorlds course
      await learnWorldsService.enrollUserInCourse(customer.email, courseId, userData);
      
      console.log(`Successfully enrolled customer ${customer.id} in course ${courseId} due to new subscription`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order creation webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle order payment webhook (for subscription orders that were pending payment)
router.post('/orders/paid', verifyShopifyWebhook, async (req, res) => {
  try {
    const { id, customer, line_items, tags } = req.body;
    
    // Check if this order is related to a subscription (by checking tags)
    const isSubscription = tags && Array.isArray(tags) && 
      tags.some(tag => tag.toLowerCase().includes('subscription'));
    
    if (!isSubscription) {
      console.log(`Order ${id} paid but not a subscription, skipping LearnWorlds enrollment`);
      return res.status(200).json({ success: true, message: 'Not a subscription order' });
    }
    
    if (!customer || !customer.email || !line_items || !line_items.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Processing paid subscription for order ${id}, customer ${customer.id}`);
    
    // Process each product in the order
    for (const item of line_items) {
      const product_id = item.product_id;
      if (!product_id) continue;
      
      // Get the corresponding LearnWorlds course ID for this Shopify product
      const courseId = await getCourseIdForProduct(product_id);
      
      if (!courseId) {
        console.log(`No matching course found for product ${product_id}`);
        continue;
      }
      
      // Create user data object for enrollment
      const userData = {
        email: customer.email,
        first_name: customer.first_name || '',
        last_name: customer.last_name || ''
      };
      
      // Enroll the customer in the LearnWorlds course
      await learnWorldsService.enrollUserInCourse(customer.email, courseId, userData);
      
      console.log(`Successfully enrolled customer ${customer.id} in course ${courseId} due to paid subscription`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order payment webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle refund webhook (for subscription refunds)
router.post('/refunds/create', verifyShopifyWebhook, async (req, res) => {
  try {
    const { id, order_id } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id field' });
    }
    
    // We need to fetch the order details to get customer and line items
    // For simplicity, we'll assume the order details are included in the webhook
    // In a real implementation, you might need to fetch the order using the Shopify API
    const order = req.body.order;
    
    if (!order || !order.customer || !order.line_items) {
      console.log(`Refund ${id} for order ${order_id} doesn't include order details, cannot process`);
      return res.status(200).json({ success: true, message: 'Insufficient order details' });
    }
    
    // Check if this order is related to a subscription (by checking tags)
    const isSubscription = order.tags && Array.isArray(order.tags) && 
      order.tags.some(tag => tag.toLowerCase().includes('subscription'));
    
    if (!isSubscription) {
      console.log(`Refund for order ${order_id} but not a subscription, skipping LearnWorlds unenrollment`);
      return res.status(200).json({ success: true, message: 'Not a subscription order' });
    }
    
    console.log(`Processing refund for subscription order ${order_id}`);
    
    // Process each product in the order
    for (const item of order.line_items) {
      const product_id = item.product_id;
      if (!product_id) continue;
      
      // Get the corresponding LearnWorlds course ID for this Shopify product
      const courseId = await getCourseIdForProduct(product_id);
      
      if (!courseId) {
        console.log(`No matching course found for product ${product_id}`);
        continue;
      }
      
      // Unenroll the customer from the LearnWorlds course
      await learnWorldsService.unenrollUserFromCourse(order.customer.email, courseId);
      
      console.log(`Successfully unenrolled customer ${order.customer.id} from course ${courseId} due to subscription refund`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing refund webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// No longer need the helper function as we're using the utility module

module.exports = router;