const axios = require('axios');
const { getLearnWorldsConfig } = require('../config/learnWorlds');
const { getCourseIdForProduct } = require('../utils/productCourseMapping');

/**
 * Service for interacting with the LearnWorlds API
 */
class LearnWorldsService {
  constructor() {
    const config = getLearnWorldsConfig();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.schoolId = config.schoolId;
    
    // Log configuration for debugging (without exposing sensitive data)
    console.log(`LearnWorlds Service initialized:`);
    console.log(`- Base URL: ${this.baseUrl}`);
    console.log(`- School ID: ${this.schoolId}`);
    console.log(`- API Key configured: ${this.apiKey ? 'Yes' : 'No'}`);
  }

  /**
   * Get the HTTP headers required for LearnWorlds API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test API connection to LearnWorlds
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      console.log('Testing LearnWorlds API connection...');
      const response = await axios.get(
        `${this.baseUrl}/v2/users?limit=1`,
        { headers: this.getHeaders() }
      );
      console.log(`API connection successful. Status: ${response.status}`);
      return true;
    } catch (error) {
      console.error(`API connection failed: ${error.response?.status} - ${error.message}`);
      if (error.response?.data) {
        console.error('Error details:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Find a user in LearnWorlds by email
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserByEmail(email) {
    try {
      console.log(`Searching for user with email: ${email}`);
      
      // Method 1: Try the search endpoint with email parameter
      try {
        console.log('Trying Method 1: GET /v2/users?email=...');
        const response1 = await axios.get(
          `${this.baseUrl}/v2/users?email=${encodeURIComponent(email)}`,
          { headers: this.getHeaders() }
        );
        
        console.log(`Method 1 response status: ${response1.status}`);
        console.log(`Method 1 found ${response1.data ? response1.data.length : 0} users`);
        
        if (response1.data && response1.data.length > 0) {
          console.log(`Method 1 found user: ${response1.data[0].id} - ${response1.data[0].email}`);
          return response1.data[0];
        }
      } catch (method1Error) {
        console.log(`Method 1 failed: ${method1Error.response?.status} - ${method1Error.message}`);
      }
      
      // Method 2: Try getting all users and filter by email (for small user bases)
      try {
        console.log('Trying Method 2: GET /v2/users (all users)');
        const response2 = await axios.get(
          `${this.baseUrl}/v2/users?limit=100`,
          { headers: this.getHeaders() }
        );
        
        console.log(`Method 2 response status: ${response2.status}`);
        console.log(`Method 2 retrieved ${response2.data ? response2.data.length : 0} users`);
        
        if (response2.data && response2.data.length > 0) {
          const user = response2.data.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
          if (user) {
            console.log(`Method 2 found user: ${user.id} - ${user.email}`);
            return user;
          } else {
            console.log(`Method 2: No user found with email ${email} among ${response2.data.length} users`);
            // Log first few users for debugging
            const sampleUsers = response2.data.slice(0, 3).map(u => `${u.id}: ${u.email}`).join(', ');
            console.log(`Sample users: ${sampleUsers}`);
          }
        }
      } catch (method2Error) {
        console.log(`Method 2 failed: ${method2Error.response?.status} - ${method2Error.message}`);
      }
      
      console.log(`No users found with email ${email} using any method`);
      return null;
    } catch (error) {
      console.log(`Error details: Status ${error.response?.status}, Message: ${error.message}`);
      
      // If it's a 404 or the user is not found, return null instead of throwing
      if (error.response && (error.response.status === 404 || error.response.status === 400)) {
        console.log(`User with email ${email} not found in LearnWorlds (${error.response.status})`);
        return null;
      }
      
      console.error('Error finding LearnWorlds user:', error.message);
      throw new Error(`Failed to find user in LearnWorlds: ${error.message}`);
    }
  }

  /**
   * Unenroll a user from a specific course in LearnWorlds
   * @param {string} userEmail - Email of the user to unenroll
   * @param {string} courseId - ID of the course to unenroll from (Shopify product ID)
   * @param {string} productName - Optional product name for bundle mapping
   * @returns {Promise<boolean>} Success status
   */
  async unenrollUserFromCourse(userEmail, courseId, productName = '') {
    try {
      console.log(`Starting unenrollment process for ${userEmail} from product ${courseId} (${productName})`);
      
      // First, find the user by email
      const user = await this.findUserByEmail(userEmail);
      
      if (!user) {
        console.log(`User with email ${userEmail} not found in LearnWorlds - cannot unenroll (user was likely never enrolled)`);
        console.log(`This might indicate: 1) User was never enrolled, 2) Different email used in LearnWorlds, 3) User was manually removed`);
        
        // Test API connection to help diagnose the issue
        console.log('Testing API connection to verify LearnWorlds accessibility...');
        const connectionOk = await this.testConnection();
        if (!connectionOk) {
          console.error('LearnWorlds API connection failed - this may explain why the user was not found');
        } else {
          console.log('LearnWorlds API connection is working - user genuinely not found');
        }
        
        return true; // Return true since the desired state (user not enrolled) is achieved
      }
      
      console.log(`Found user in LearnWorlds: ${user.id} - ${user.email}`);
      
      // Get the LearnWorlds course ID using product mapping
      const learnWorldsCourseId = await getCourseIdForProduct(courseId, productName);
      
      if (!learnWorldsCourseId) {
        console.warn(`No LearnWorlds course mapping found for product ${courseId} (${productName})`);
        return false;
      }
      
      // Unenroll the user from the course
      try {
        const response = await axios.delete(
          `${this.baseUrl}/v2/users/${user.id}/courses/${learnWorldsCourseId}`,
          { headers: this.getHeaders() }
        );
        
        console.log(`Successfully unenrolled user ${userEmail} from LearnWorlds course ${learnWorldsCourseId} (product: ${productName || courseId})`);
        return true;
      } catch (unenrollError) {
        // If the user is not enrolled in the course (404), that's also a success state
        if (unenrollError.response && unenrollError.response.status === 404) {
          console.log(`User ${userEmail} was not enrolled in course ${learnWorldsCourseId} - unenrollment not needed`);
          return true;
        }
        throw unenrollError;
      }
    } catch (error) {
      console.error('Error unenrolling user from course:', error.message);
      throw new Error(`Failed to unenroll user from course: ${error.message}`);
    }
  }

  /**
   * Create a user in LearnWorlds if they don't exist
   * @param {Object} userData - User data including email, first_name, last_name
   * @returns {Promise<Object>} Created or found user object
   */
  async createUserIfNotExists(userData) {
    try {
      // First check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      
      if (existingUser) {
        console.log(`User with email ${userData.email} already exists in LearnWorlds`);
        return existingUser;
      }
      
      // Create the user if they don't exist
      const response = await axios.post(
        `${this.baseUrl}/v2/users`,
        {
          email: userData.email,
          first_name: userData.first_name || '',
          last_name: userData.last_name || ''
        },
        { headers: this.getHeaders() }
      );
      
      console.log(`Successfully created user ${userData.email} in LearnWorlds`);
      return response.data;
    } catch (error) {
      console.error('Error creating LearnWorlds user:', error.message);
      throw new Error(`Failed to create user in LearnWorlds: ${error.message}`);
    }
  }

  /**
   * Enroll a user in a specific course in LearnWorlds
   * @param {string} userEmail - Email of the user to enroll
   * @param {string} courseId - ID of the course to enroll in (Shopify product ID)
   * @param {Object} userData - Optional user data if user needs to be created
   * @param {string} productName - Optional product name for bundle mapping
   * @returns {Promise<boolean>} Success status
   */
  async enrollUserInCourse(userEmail, courseId, userData = {}, productName = '') {
    try {
      // Ensure the user exists
      let user = await this.findUserByEmail(userEmail);
      
      if (!user) {
        // Create the user if they don't exist
        userData.email = userEmail;
        user = await this.createUserIfNotExists(userData);
      }
      
      // Get the LearnWorlds course ID using product mapping
      const learnWorldsCourseId = await getCourseIdForProduct(courseId, productName);
      
      if (!learnWorldsCourseId) {
        console.warn(`No LearnWorlds course mapping found for product ${courseId} (${productName})`);
        return false;
      }
      
      // Enroll the user in the course
      const response = await axios.post(
        `${this.baseUrl}/v2/users/${user.id}/courses/${learnWorldsCourseId}`,
        {}, // Empty body as we're just creating the enrollment
        { headers: this.getHeaders() }
      );
      
      console.log(`Successfully enrolled user ${userEmail} in LearnWorlds course ${learnWorldsCourseId} (product: ${productName || courseId})`);
      return true;
    } catch (error) {
      console.error('Error enrolling user in course:', error.message);
      throw new Error(`Failed to enroll user in course: ${error.message}`);
    }
  }
}

module.exports = new LearnWorldsService();