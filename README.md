# Shopify Webhook App for LearnWorlds Integration

This application integrates Shopify with LearnWorlds to automatically unenroll customers from courses when they unsubscribe from a product in Shopify.

## Features

- Listens for Shopify webhook events when customers unsubscribe from products
- Automatically unenrolls customers from corresponding LearnWorlds courses
- Secure webhook verification
- Configurable product-to-course mapping
- Deployed on Vercel for reliability and scalability

## Prerequisites

- Node.js (v14 or higher)
- Shopify Partner account with API credentials
- LearnWorlds account with API access
- Vercel account (for deployment)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example` and fill in your credentials:

```bash
cp .env.example .env
```

## Configuration

### Shopify Setup

1. Create a private app in your Shopify Partner dashboard
2. Generate API credentials and set the required scopes
3. Configure a webhook for the "Product Subscription Cancelled" event, pointing to your app's webhook endpoint:
   - For local development: `https://your-ngrok-url.ngrok.io/api/webhooks/product-subscription-cancelled`
   - For production: `https://your-vercel-app.vercel.app/api/webhooks/product-subscription-cancelled`

### LearnWorlds Setup

1. Generate an API key in your LearnWorlds admin panel
2. Note your school ID and API URL

### Product-Course Mapping

Use the provided utility functions to map your Shopify product IDs to LearnWorlds course IDs:

```javascript
const { setProductCourseMapping, getCourseIdForProduct } = require('./src/utils/productCourseMapping');

// Add a mapping
setProductCourseMapping('shopify_product_id', 'learnworlds_course_id');

// Get a course ID for a product
const courseId = getCourseIdForProduct('shopify_product_id');
```

In production, mappings are stored in a file at `/tmp/product_course_mapping.json` on Vercel.

## Vercel Deployment

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Set up the following environment variables in Vercel:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SHOPIFY_API_SCOPES`
   - `SHOPIFY_API_VERSION`
   - `LEARNWORLDS_API_KEY`
   - `LEARNWORLDS_API_URL`
   - `LEARNWORLDS_SCHOOL_ID`
   - `HOST` (your Vercel app URL)
   - `NODE_ENV` (set to "production")
4. Deploy your application

## Local Development

1. Start the development server:
   ```bash
   npm start
   ```

2. Use a tool like ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

3. Update your Shopify webhook URL to point to your ngrok URL

## Testing

To test the webhook:

1. Ensure your webhook URL is properly configured in Shopify
2. Trigger a subscription cancellation event in Shopify
3. Check the logs to verify the webhook was received and processed

## License

MIT