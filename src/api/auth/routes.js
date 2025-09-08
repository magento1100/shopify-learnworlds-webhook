const express = require('express');
const router = express.Router();
// Import Shopify API adapter first
require('@shopify/shopify-api/adapters/node');
const { shopifyApi } = require('@shopify/shopify-api');
const { createErrorResponse } = require('../../utils/errorHandler');

/**
 * Generate a URL to begin the OAuth process
 */
router.get('/begin', async (req, res) => {
  try {
    const shop = req.query.shop;
    
    if (!shop) {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }
    
    // Ensure the shop is a valid Shopify shop
    // Note: In the new API version, we need to create a shopify instance first
    const shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: process.env.SHOPIFY_API_SCOPES?.split(',') || ['read_products', 'write_products'],
      hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost:3000',
      apiVersion: process.env.SHOPIFY_API_VERSION || '2023-10',
      isEmbeddedApp: true,
    });
    
    // Validate shop domain
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).json({ error: 'Invalid shop domain' });
    }
    
    // Generate the authorization URL
    const authRoute = `/api/auth/callback`;
    const redirectUrl = `${process.env.HOST}${authRoute}`;
    
    // Create OAuth begin URL
    const authUrl = await shopify.auth.beginAuth({
      shop,
      callbackPath: redirectUrl,
      isOnline: false,
      scopes: process.env.SHOPIFY_API_SCOPES?.split(',') || ['read_products', 'write_products']
    });
    
    // Redirect to the authorization URL
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error beginning auth:', error);
    res.status(500).json(createErrorResponse(error, 'auth/begin'));
  }
});

/**
 * Handle the OAuth callback from Shopify
 */
router.get('/callback', async (req, res) => {
  try {
    // Create a shopify instance
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_API_SCOPES?.split(',') || ['read_products', 'write_products'],
    hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost:3000',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2023-10',
    isEmbeddedApp: true,
  });
    
    // Validate the callback
    const callbackResponse = await shopify.auth.validateAuthCallback({
      rawRequest: req,
      rawResponse: res
    });
    
    // At this point, the OAuth process is complete and we have a valid session
    console.log('Authentication successful, session created');
    
    // Store the session for future use
    // In a production app, you would store this in a database
    
    // Redirect to the app
    res.redirect(`/?shop=${req.query.shop}`);
  } catch (error) {
    console.error('Error validating auth callback:', error);
    res.status(500).json(createErrorResponse(error, 'auth/callback'));
  }
});

/**
 * Check if the current session is valid
 */
router.get('/check', async (req, res) => {
  try {
    const shop = req.query.shop;
    
    if (!shop) {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }
    
    // In a production app, you would retrieve the session from a database
    // For this example, we'll just check if the shop is valid
    
    // Create a shopify instance
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_API_SCOPES?.split(',') || ['read_products', 'write_products'],
    hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost:3000',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2023-10',
    isEmbeddedApp: true,
  });
    
    // Validate shop domain
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).json({ error: 'Invalid shop domain' });
    }
    
    // Check if we have a valid session for this shop
    // In a real app, you would check your session storage
    const hasSession = true; // Placeholder for actual session check
    
    if (hasSession) {
      return res.status(200).json({ authenticated: true });
    } else {
      return res.status(401).json({ authenticated: false });
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    res.status(500).json(createErrorResponse(error, 'auth/check'));
  }
});

module.exports = router;