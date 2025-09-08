/**
 * Configuration for LearnWorlds API
 */

/**
 * Get LearnWorlds API configuration from environment variables
 * @returns {Object} LearnWorlds configuration
 */
function getLearnWorldsConfig() {
  return {
    apiKey: process.env.LEARNWORLDS_API_KEY,
    baseUrl: process.env.LEARNWORLDS_API_URL || 'https://api.learnworlds.com',
    schoolId: process.env.LEARNWORLDS_SCHOOL_ID
  };
}

module.exports = {
  getLearnWorldsConfig
};