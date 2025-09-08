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
    const { id } = req.body;
    
    console.log(`Processing order cancellation for order ${id}`);
    
    // Get the shop domain from the headers
    const shopDomain = req.headers['x-shopify-shop-domain'];
    if (!shopDomain) {
      console.log(`Order cancellation ${id} missing shop domain in headers`);
      return res.status(200).json({ success: true, message: 'Missing shop domain' });
    }
    
    try {
      // Create a new admin REST client for the shop
      const restClient = new shopify.clients.Rest({
        session: {
          shop: shopDomain,
          accessToken: process.env.SHOPIFY_API_SECRET // Using API secret as access token for API calls
        }
      });
      
      // Fetch the order details using the Shopify REST API
      const response = await restClient.get({
        path: `orders/${id}`,
        query: {
          fields: 'id,customer,line_items,tags'
        }
      });
      
      const order = response.body.order;
      
      if (!order || !order.customer || !order.customer.email || !order.line_items) {
        console.log(`Could not retrieve complete order details for order ${id}`);
        return res.status(200).json({ success: true, message: 'Incomplete order details' });
      }
      
      // Check if this order is related to a subscription (by checking tags)
      const isSubscription = order.tags && 
        order.tags.split(',').some(tag => tag.trim().toLowerCase().includes('subscription'));
      
      if (!isSubscription) {
        console.log(`Order ${id} cancelled but not a subscription, skipping LearnWorlds unenrollment`);
        return res.status(200).json({ success: true, message: 'Not a subscription order' });
      }
      
      console.log(`Processing subscription cancellation for order ${id}, customer ${order.customer.id}`);
      
      // Process each product in the order
      for (const item of order.line_items) {
        const product_id = item.product_id;
        const product_title = item.title || '';
        if (!product_id) continue;
        
        // Get the corresponding LearnWorlds course ID for this Shopify product
        // Pass both product ID and product name to handle bundle products
        const courseId = await getCourseIdForProduct(product_id, product_title);
        
        if (!courseId) {
          console.log(`No matching course found for product ${product_id} (${product_title})`);
          continue;
        }
        
        // Unenroll the customer from the LearnWorlds course
        await learnWorldsService.unenrollUserFromCourse(order.customer.email, courseId);
        
        console.log(`Successfully unenrolled customer ${order.customer.id} from course ${courseId} due to subscription cancellation of product ${product_title}`);
      }
      
    } catch (apiError) {
      console.error(`Error fetching order details from Shopify API:`, apiError);
      return res.status(200).json({ success: true, message: 'Error fetching order details' });
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
    const { id } = req.body;
    
    console.log(`Processing order creation for order ${id}`);
    
    // Get the shop domain from the headers
    const shopDomain = req.headers['x-shopify-shop-domain'];
    if (!shopDomain) {
      console.log(`Order creation ${id} missing shop domain in headers`);
      return res.status(200).json({ success: true, message: 'Missing shop domain' });
    }
    
    try {
      // Create a new admin REST client for the shop
      const restClient = new shopify.clients.Rest({
        session: {
          shop: shopDomain,
          accessToken: process.env.SHOPIFY_API_SECRET // Using API secret as access token for API calls
        }
      });
      
      // Fetch the order details using the Shopify REST API
      const response = await restClient.get({
        path: `orders/${id}`,
        query: {
          fields: 'id,customer,line_items,tags,financial_status'
        }
      });
      
      const order = response.body.order;
      
      if (!order || !order.customer || !order.customer.email || !order.line_items) {
        console.log(`Could not retrieve complete order details for order ${id}`);
        return res.status(200).json({ success: true, message: 'Incomplete order details' });
      }
      
      // Check if this order is related to a subscription (by checking tags)
      const isSubscription = order.tags && 
        order.tags.split(',').some(tag => tag.trim().toLowerCase().includes('subscription'));
      
      if (!isSubscription) {
        console.log(`Order ${id} created but not a subscription, skipping LearnWorlds enrollment`);
        return res.status(200).json({ success: true, message: 'Not a subscription order' });
      }
      
      // Only process paid or authorized orders
      if (order.financial_status !== 'paid' && order.financial_status !== 'authorized') {
        console.log(`Subscription order ${id} has financial status ${order.financial_status}, not processing until paid`);
        return res.status(200).json({ success: true, message: 'Order not paid yet' });
      }
      
      console.log(`Processing new subscription for order ${id}, customer ${order.customer.id}`);
      
      // Process each product in the order
      for (const item of order.line_items) {
        const product_id = item.product_id;
        const product_title = item.title || '';
        if (!product_id) continue;
        
        // Create user data object for enrollment
        const userData = {
          email: order.customer.email,
          first_name: order.customer.first_name || '',
          last_name: order.customer.last_name || ''
        };
        
        // Get the corresponding LearnWorlds course ID for this Shopify product
        // Pass both product ID and product name to handle bundle products
        const courseId = await getCourseIdForProduct(product_id, product_title);
        
        if (!courseId) {
          console.log(`No matching course found for product ${product_id} (${product_title})`);
          continue;
        }
        
        // Enroll the customer in the LearnWorlds course
        await learnWorldsService.enrollUserInCourse(order.customer.email, courseId, userData);
        
        console.log(`Successfully enrolled customer ${order.customer.id} in course ${courseId} due to new subscription for product ${product_title}`);
      }
      
    } catch (apiError) {
      console.error(`Error fetching order details from Shopify API:`, apiError);
      return res.status(200).json({ success: true, message: 'Error fetching order details' });
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
    const { id } = req.body;
    
    console.log(`Processing order payment for order ${id}`);
    
    // Get the shop domain from the headers
    const shopDomain = req.headers['x-shopify-shop-domain'];
    if (!shopDomain) {
      console.log(`Order payment ${id} missing shop domain in headers`);
      return res.status(200).json({ success: true, message: 'Missing shop domain' });
    }
    
    try {
      // Create a new admin REST client for the shop
      const restClient = new shopify.clients.Rest({
        session: {
          shop: shopDomain,
          accessToken: process.env.SHOPIFY_API_SECRET // Using API secret as access token for API calls
        }
      });
      
      // Fetch the order details using the Shopify REST API
      const response = await restClient.get({
        path: `orders/${id}`,
        query: {
          fields: 'id,customer,line_items,tags,financial_status'
        }
      });
      
      const order = response.body.order;
      
      if (!order || !order.customer || !order.customer.email || !order.line_items) {
        console.log(`Could not retrieve complete order details for order ${id}`);
        return res.status(200).json({ success: true, message: 'Incomplete order details' });
      }
      
      // Check if this order is related to a subscription (by checking tags)
      const isSubscription = order.tags && 
        order.tags.split(',').some(tag => tag.trim().toLowerCase().includes('subscription'));
      
      if (!isSubscription) {
        console.log(`Order ${id} paid but not a subscription, skipping LearnWorlds enrollment`);
        return res.status(200).json({ success: true, message: 'Not a subscription order' });
      }
      
      console.log(`Processing paid subscription for order ${id}, customer ${order.customer.id}`);
      
      // Process each product in the order
      for (const item of order.line_items) {
        const product_id = item.product_id;
        const product_title = item.title || '';
        if (!product_id) continue;
        
        // Create user data object for enrollment
        const userData = {
          email: order.customer.email,
          first_name: order.customer.first_name || '',
          last_name: order.customer.last_name || ''
        };
        
        // Get the corresponding LearnWorlds course ID for this Shopify product
        // Pass both product ID and product name to handle bundle products
        const courseId = await getCourseIdForProduct(product_id, product_title);
        
        if (!courseId) {
          console.log(`No matching course found for product ${product_id} (${product_title})`);
          continue;
        }
        
        // Enroll the customer in the LearnWorlds course
        await learnWorldsService.enrollUserInCourse(order.customer.email, courseId, userData);
        
        console.log(`Successfully enrolled customer ${order.customer.id} in course ${courseId} due to paid subscription for product ${product_title}`);
      }
      
    } catch (apiError) {
      console.error(`Error fetching order details from Shopify API:`, apiError);
      return res.status(200).json({ success: true, message: 'Error fetching order details' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing order payment webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle refund webhook (for subscription cancellations via refund)
router.post('/refunds/create', verifyShopifyWebhook, async (req, res) => {
  try {
    const { id, order_id } = req.body;
    
    if (!order_id) {
      console.log(`Refund ${id} doesn't include order_id, cannot process`);
      return res.status(200).json({ success: true, message: 'Missing order_id' });
    }
    
    console.log(`Processing refund ${id} for order ${order_id}`);
    
    // Get the shop domain from the headers
    const shopDomain = req.headers['x-shopify-shop-domain'];
    if (!shopDomain) {
      console.log(`Refund ${id} missing shop domain in headers`);
      return res.status(200).json({ success: true, message: 'Missing shop domain' });
    }
    
    try {
      // Create a new admin REST client for the shop
      const restClient = new shopify.clients.Rest({
        session: {
          shop: shopDomain,
          accessToken: process.env.SHOPIFY_API_SECRET // Using API secret as access token for API calls
        }
      });
      
      // Fetch the order details using the Shopify REST API
      const orderResponse = await restClient.get({
        path: `orders/${order_id}`,
        query: {
          fields: 'id,customer,line_items,tags'
        }
      });
      
      const order = orderResponse.body.order;
      
      if (!order) {
        console.log(`Could not retrieve order details for order ${order_id}`);
        return res.status(200).json({ success: true, message: 'Could not retrieve order details' });
      }
      
      if (!order.customer || !order.customer.email || !order.line_items || !order.line_items.length) {
        console.log(`Order ${order_id} missing required customer or line item details`);
        return res.status(200).json({ success: true, message: 'Missing required fields in order' });
      }
      
      // Check if this order is related to a subscription (by checking tags)
      const isSubscription = order.tags && 
        order.tags.split(',').some(tag => tag.trim().toLowerCase().includes('subscription'));
      
      if (!isSubscription) {
        console.log(`Refund ${id} for order ${order_id} but not a subscription, skipping LearnWorlds unenrollment`);
        return res.status(200).json({ success: true, message: 'Not a subscription order' });
      }
      
      console.log(`Processing refund ${id} for subscription order ${order_id}, customer ${order.customer.id}`);
      
      // Process each product in the order
      for (const item of order.line_items) {
        const product_id = item.product_id;
        const product_title = item.title || '';
        if (!product_id) continue;
        
        // Get the corresponding LearnWorlds course ID for this Shopify product
        // Pass both product ID and product name to handle bundle products
        const courseId = await getCourseIdForProduct(product_id, product_title);
        
        if (!courseId) {
          console.log(`No matching course found for product ${product_id} (${product_title})`);
          continue;
        }
        
        // Unenroll the customer from the LearnWorlds course
        await learnWorldsService.unenrollUserFromCourse(order.customer.email, courseId);
        
        console.log(`Successfully unenrolled customer ${order.customer.id} from course ${courseId} due to refund of product ${product_title}`);
      }
      
    } catch (apiError) {
      console.error(`Error fetching order details from Shopify API:`, apiError);
      return res.status(200).json({ success: true, message: 'Error fetching order details' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing refund webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// No longer need the helper function as we're using the utility module

module.exports = router;