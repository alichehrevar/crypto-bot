const axios = require('axios');
const jwt = require('jsonwebtoken');
const logger = require('../../logs/logger');

// Load environment variables
require('dotenv').config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!N8N_BASE_URL || !JWT_SECRET) {
    logger.error('N8N_BASE_URL or JWT_SECRET is not defined in environment variables.');
    // Throwing an error might be better to stop the app if config is missing
}

/**
 * Custom Error for n8n workflow failures.
 * This allows us to pass structured error data back to the controller.
 */
class N8nWorkflowError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'N8nWorkflowError';
        this.status = status; // HTTP status code from n8n (e.g., 400, 500)
        this.data = data;     // The response body from n8n
    }
}

/**
 * Triggers an n8n workflow with a given webhook path and data.
 * @param {string} webhookPath - The path of the n8n webhook (e.g., /webhook/my-workflow).
 * @param {object} data - The raw JSON body to send to the workflow.
 * @returns {Promise<object>} The response data from the n8n workflow.
 */
async function triggerWorkflow(webhookPath, data) {
    if (!webhookPath.startsWith('/')) {
        webhookPath = `/${webhookPath}`;
    }

    const workflowUrl = `${N8N_BASE_URL}${webhookPath}`;

    try {
        // Generate the JWT token
        // n8n typically just needs a simple token, but you can add payload/options if needed
        const token = jwt.sign({}, JWT_SECRET, { algorithm: 'HS256' });

        logger.info(`Triggering n8n workflow at: ${workflowUrl}`);

        // Make the POST request
        const response = await axios.post(workflowUrl, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        logger.info(`Workflow ${webhookPath} triggered successfully.`);
        return response.data;

    } catch (error) {
        logger.error(`Error triggering n8n workflow ${webhookPath}:`, error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            logger.error('n8n Response Data:', error.response.data);
            logger.error('n8n Response Status:', error.response.status);

            // Re-throw a custom error with all details
            throw new N8nWorkflowError(
                `n8n workflow failed with status ${error.response.status}`,
                error.response.status,
                error.response.data
            );

        } else if (error.request) {
            // The request was made but no response was received
            logger.error('n8n No response received:', error.request);
            // Re-throw a standard error
            throw new Error(`Failed to trigger n8n workflow: No response received from ${workflowUrl}`);
        } else {
            // Something happened in setting up the request that triggered an Error
            logger.error('n8n Request Setup Error:', error.message);
            // Re-throw a standard error
            throw new Error(`Failed to trigger n8n workflow: ${error.message}`);
        }
    }
}

module.exports = {
    triggerWorkflow,
    N8nWorkflowError, // Export the custom error
};
