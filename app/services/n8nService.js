const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const logger = require('../../logs/logger');
const { N8nWorkflowJob_CustomAiDB, CustomAIWorkflowJob_DefaultDB} = require('../models/N8nWorkflowJob');
// Import the new response model
const { N8nJobResponse_CustomAiDB, CustomAIJobResponse_DefaultDB} = require('../models/N8nJobResponse');

// Load environment variables
require('dotenv').config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast if configuration is missing
if (!N8N_BASE_URL || !JWT_SECRET) {
    throw new Error('CRITICAL: N8N_BASE_URL or JWT_SECRET is not defined in environment variables.');
}

/**
 * Custom Error for n8n workflow failures.
 */
class N8nWorkflowError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'N8nWorkflowError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Custom Error for Service layer resource issues (Not Found / Forbidden)
 * Helpful for the controller to decide which HTTP status code to return.
 */
class ServiceError extends Error {
    constructor(message, type = 'GENERAL') {
        super(message);
        this.name = 'ServiceError';
        this.type = type; // 'NOT_FOUND', 'FORBIDDEN', 'VALIDATION'
    }
}

// ==========================================
// INTERNAL / LOW-LEVEL HELPERS
// ==========================================

/**
 * Helper function to upload a string to GridFS
 * @param {GridFSBucket} bucket - The GridFS bucket instance
 * @param {string} filename - The name for the file
 * @param {string} content - The string content to upload
 * @returns {Promise<mongoose.Types.ObjectId>} - The ObjectId of the saved file
 */
function uploadToGridFS(bucket, filename, content) {
    return new Promise((resolve, reject) => {
        const stream = Readable.from(content);
        const uploadStream = bucket.openUploadStream(filename, {
            contentType: filename.endsWith('.svg') ? 'image/svg+xml' : 'text/plain',
        });

        stream.pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
                resolve(uploadStream.id); // This is the file's ObjectId
            });
    });
}

/**
 * Low-level function to trigger an n8n workflow via HTTP.
 * @param {string} webhookPath
 * @param {object} data
 * @returns {Promise<object>}
 */
async function triggerWorkflowHttp(webhookPath, data) {
    if (!webhookPath.startsWith('/')) {
        webhookPath = `/${webhookPath}`;
    }

    const workflowUrl = `${N8N_BASE_URL}${webhookPath}`;

    try {
        // Generate a short-lived token
        const token = jwt.sign({}, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1m' });

        logger.info(`Triggering n8n workflow at: ${workflowUrl}`);

        const response = await axios.post(workflowUrl, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            timeout: 600000 // 60 seconds
        });

        logger.info(`Workflow ${webhookPath} triggered successfully. n8n responded.`);
        return response.data;

    } catch (error) {
        logger.error(`Error triggering n8n workflow ${webhookPath}:`, error.message);
        if (error.response) {
            throw new N8nWorkflowError(
                `n8n workflow failed with status ${error.response.status}`,
                error.response.status,
                error.response.data
            );
        } else if (error.request) {
            throw new Error(`Failed to trigger n8n workflow: No response received from ${workflowUrl}`);
        } else {
            throw new Error(`Failed to trigger n8n workflow: ${error.message}`);
        }
    }
}

/**
 * Background executor that *triggers* the workflow and updates the Mongoose job model.
 * It no longer waits for completion.
 * @param {N8nWorkflowJob_CustomAiDB} job - The Mongoose document.
 */
async function executeWorkflowAndUpdate(job) {
    try {
        logger.info(`Executing ASYNC job ${job._id} for workflow: ${job.webhookPath}`);

        const payloadWithJobId = {
            ...job.requestPayload,
            jobIdFromNode: job._id.toString()
        };

        // This 'responsePayload' will be overwritten by completeJob
        // But we store the *initial* response from n8n (e.g., {"status": "started"})
        job.responsePayload = await triggerWorkflowHttp(job.webhookPath, payloadWithJobId);
        await job.save();

        logger.info(`ASYNC job ${job._id} successfully triggered. Waiting for n8n callback.`);

    } catch (error) {
        logger.error(`Failed to *trigger* ASYNC job ${job._id}: ${error.message}`);

        job.status = 'failed';
        job.error = `Failed to trigger workflow: ${error.message}`;

        if (error instanceof N8nWorkflowError) {
            job.responsePayload = error.data;
        }

        await job.save();
    }
}

// ==========================================
// PUBLIC SERVICE METHODS
// ==========================================

/**
 * Creates a job entry and immediately kicks off the background process.
 * @param {string} userId
 * @param {object} payload
 * @param {string} webhookPath
 * @param {'ai-model' | 'prompt'} type
 * @returns {Promise<N8nWorkflowJob_CustomAiDB>} The newly created job (processing state).
 */
async function initiateAsyncWorkflow(userId, payload, webhookPath, type) {
    if (!payload) {
        throw new ServiceError('Missing required fields: payload.', 'VALIDATION');
    }

    if (type !== 'prompt' && type !== 'ai-model') {
        throw new ServiceError('Invalid workflow type.', 'VALIDATION');
    }

    try {
        // 1. Create Job
        const job = await CustomAIWorkflowJob_DefaultDB.create({
            userId,
            type,
            webhookPath,
            requestPayload: payload,
            status: 'processing',
        });

        // 2. Start background execution (Fire and Forget)
        executeWorkflowAndUpdate(job).catch(err => {
            logger.error(`CRITICAL: Background workflow runner crashed for job ${job._id}: ${err.message}`);
        });

        return job;
    } catch (error) {
        if (error instanceof ServiceError) throw error;

        logger.error(`Failed to initiate ASYNC workflow job: ${error.message}`);
        throw new Error('Failed to initiate the workflow job.');
    }
}

/**
 * Retrieves job status with ownership validation.
 * @param {string} jobId
 * @param {string} userId
 * @returns {Promise<object>} Formatted job status object.
 */
async function getJobStatus(jobId, userId) {
    try {
        // Populate the 'response' field if it exists
        const job = await CustomAIWorkflowJob_DefaultDB.findById(jobId).populate('response');

        if (!job) {
            throw new ServiceError('Job not found.', 'NOT_FOUND');
        }

        if (job.userId.toString() !== userId) {
            throw new ServiceError('You are not authorized to view this job.', 'FORBIDDEN');
        }

        // Check which response to return
        let result;
        if (job.type === 'prompt' && job.response) {
            // For 'prompt' type, the full response is in the 'response' doc
            result = job.response;
        } else {
            // For other types, the response is in 'responsePayload'
            result = job.responsePayload;
        }

        return {
            jobId: job._id,
            type: job.type,
            status: job.status,
            result: result, // Return the correct, populated response
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        };

    } catch (error) {
        if (error instanceof ServiceError) throw error;

        logger.error(`Failed to get job status for ${jobId}: ${error.message}`);
        throw new Error('An error occurred while fetching the job status.');
    }
}

/**
 * [UPDATED] Handles the callback from n8n to complete or fail a job.
 * This function now routes data to `response` or `responsePayload` based on job type.
 * @param {string} jobId - The ID of the N8nWorkflowJob.
 * @param {object} finalPayload - The final result from the n8n workflow.
 * @param {object} [errorPayload] - An error payload if the n8n workflow failed.
 * @returns {Promise<N8nWorkflowJob_CustomAiDB>}
 */
async function completeJob(jobId, finalPayload, errorPayload = null) {
    if (!jobId) {
        throw new ServiceError('Missing jobId in callback.', 'VALIDATION');
    }

    const job = await N8nWorkflowJob_CustomAiDB.findById(jobId);

    if (!job) {
        throw new ServiceError(`Job not found: ${jobId}`, 'NOT_FOUND');
    }

    if (job.status !== 'processing') {
        logger.warn(`Job ${jobId} already in terminal state: ${job.status}. Ignoring callback.`);
        return job;
    }

    // --- Handle Error Case (Same for all types) ---
    if (errorPayload) {
        job.status = 'failed';
        job.error = errorPayload.message || 'n8n workflow reported failure';
        job.responsePayload = errorPayload; // Store error details in the legacy payload
        await job.save();
        logger.info(`Callback processed. Job ${jobId} status set to: failed`);
        return job;
    }

    // --- Handle Success Case (Type-dependent) ---
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (job.type === 'prompt') {

            // --- New 'prompt' logic: Use GridFS and N8nJobResponse ---

            // Get DB and GridFS bucket
            const db = mongoose.connection.db;
            const bucket = new GridFSBucket(db, { bucketName: 'jobData' });

            // Extract the core response object
            const rawResponse = finalPayload[0]?.response;
            if (!rawResponse) {
                throw new Error('Invalid response payload format for "prompt" type.');
            }

            // Extract large data
            const generatedCode = rawResponse.generatedCode.code;
            const balanceSketch = rawResponse.backtest.balanceSketch;

            // Upload large data to GridFS
            const codeFileId = await uploadToGridFS(
                bucket,
                `${job._id}_code.js`,
                generatedCode
            );
            const sketchFileId = await uploadToGridFS(
                bucket,
                `${job._id}_sketch.svg`,
                balanceSketch
            );

            // Create the new N8nJobResponse document
            const jobResponse = new N8nJobResponse_CustomAiDB({
                jobId: job._id,
                status: rawResponse.status,
                requestID: rawResponse.requestID,
                attempt: rawResponse.attempt,
                input: rawResponse.input,
                generatedCode: {
                    summary: rawResponse.generatedCode.summary,
                    generatedCodeFileId: codeFileId, // Link to GridFS file
                },
                backtest: {
                    status: rawResponse.backtest.status,
                    errorMessage: rawResponse.backtest.errorMessage,
                    roi: rawResponse.backtest.roi,
                    winRatio: rawResponse.backtest.winRatio,
                    simulatedTrades: rawResponse.backtest.simulatedTrades,
                    profitFactor: rawResponse.backtest.profitFactor,
                    sharpeRatio: rawResponse.backtest.sharpeRatio,
                    sortinoRatio: rawResponse.backtest.sortinoRatio,
                    maxDrawdown: rawResponse.backtest.maxDrawdown,
                    avgTradePnL: rawResponse.backtest.avgTradePnL,
                    avgDuration: rawResponse.backtest.avgDuration,
                    exposureTime: rawResponse.backtest.exposureTime,
                    // Parse the tradeLog string into an object
                    tradeLog: JSON.parse(rawResponse.backtest.tradeLog),
                    balanceSketchFileId: sketchFileId, // Link to GridFS file
                }
            });

            await jobResponse.save({ session });

            // Link the new response doc to the parent job
            job.response = jobResponse._id;
            // Clear responsePayload just in case (optional)
            job.responsePayload = null;

        } else {
            // --- Legacy 'ai-model' logic ---
            job.responsePayload = finalPayload; // Store final result
            job.response = null; // Ensure response ref is null
        }

        // Mark job as completed
        job.status = 'completed';
        job.error = null;

        // Save the parent job (with new link or payload)
        await job.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        logger.info(`Callback processed. Job ${jobId} status set to: completed`);

    } catch (error) {
        // If anything fails, abort the transaction
        await session.abortTransaction();
        logger.error(`Failed to process n8n callback for job ${jobId}: ${error.message}`);

        // Save job as failed (outside the transaction)
        job.status = 'failed';
        job.error = `Failed to process/save response: ${error.message}`;
        await job.save();

        throw new Error(`Failed to update job from callback: ${error.message}`);
    } finally {
        await session.endSession();
    }

    return job;
}


module.exports = {
    triggerWorkflow: triggerWorkflowHttp,
    initiateAsyncWorkflow,
    getJobStatus,
    completeJob,
    N8nWorkflowError,
    ServiceError
};
