const axios = require('axios');
const { getLearnWorldsConfig } = require('../config/learnWorlds');

/**
 * Service for interacting with the LearnWorlds API
 */
class LearnWorldsService {
  constructor() {
    const config = getLearnWorldsConfig();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.schoolId = config.schoolId;
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
   * Find a user in LearnWorlds by email
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findUserByEmail(email) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/users?email=${encodeURIComponent(email)}`,
        { headers: this.getHeaders() }
      );

      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error finding LearnWorlds user:', error.message);
      throw new Error(`Failed to find user in LearnWorlds: ${error.message}`);
    }
  }

  /**
   * Unenroll a user from a specific course in LearnWorlds
   * @param {string} userEmail - Email of the user to unenroll
   * @param {string} courseId - ID of the course to unenroll from
   * @returns {Promise<boolean>} Success status
   */
  async unenrollUserFromCourse(userEmail, courseId) {
    try {
      // First, find the user by email
      const user = await this.findUserByEmail(userEmail);
      
      if (!user) {
        console.warn(`User with email ${userEmail} not found in LearnWorlds`);
        return false;
      }
      
      // Unenroll the user from the course
      const response = await axios.delete(
        `${this.baseUrl}/v2/users/${user.id}/courses/${courseId}`,
        { headers: this.getHeaders() }
      );
      
      console.log(`Successfully unenrolled user ${userEmail} from course ${courseId}`);
      return true;
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
   * @param {string} courseId - ID of the course to enroll in
   * @param {Object} userData - Optional user data if user needs to be created
   * @returns {Promise<boolean>} Success status
   */
  async enrollUserInCourse(userEmail, courseId, userData = {}) {
    try {
      // Ensure the user exists
      let user = await this.findUserByEmail(userEmail);
      
      if (!user) {
        // Create the user if they don't exist
        userData.email = userEmail;
        user = await this.createUserIfNotExists(userData);
      }
      
      // Enroll the user in the course
      const response = await axios.post(
        `${this.baseUrl}/v2/users/${user.id}/courses/${courseId}`,
        {}, // Empty body as we're just creating the enrollment
        { headers: this.getHeaders() }
      );
      
      console.log(`Successfully enrolled user ${userEmail} in course ${courseId}`);
      return true;
    } catch (error) {
      console.error('Error enrolling user in course:', error.message);
      throw new Error(`Failed to enroll user in course: ${error.message}`);
    }
  }
}

module.exports = new LearnWorldsService();