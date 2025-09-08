/**
 * Utility for standardized error handling
 */

/**
 * Create a standardized error response
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @returns {Object} Standardized error object
 */
function createErrorResponse(error, context) {
  console.error(`Error in ${context}:`, error);
  
  return {
    error: true,
    message: error.message || 'An unknown error occurred',
    context,
    timestamp: new Date().toISOString(),
    // Don't include stack trace in production
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  };
}

/**
 * Express middleware for handling errors
 */
function errorMiddleware(err, req, res, next) {
  const errorResponse = createErrorResponse(err, req.originalUrl);
  
  res.status(err.statusCode || 500).json(errorResponse);
}

module.exports = {
  createErrorResponse,
  errorMiddleware
};