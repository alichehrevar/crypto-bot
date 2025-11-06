const { triggerWorkflow, N8nWorkflowError } = require('../../../services/n8nService'); // Import both triggerWorkflow and N8nWorkflowError
const N8nWorkflowJob = require('../../../models/N8nWorkflowJob'); // Import the new model
const logger = require('../../../../logs/logger'); // Adjust path as needed

/**
 * A separate function to run the workflow in the background.
 * This is called by triggerAsync and is NOT awaited.
 * @param {N8nWorkflowJob} job - The Mongoose document for the job.
 */
async function executeWorkflowAndUpdate(job) {
    try {
        logger.info(`Executing ASYNC job ${job._id} for workflow: ${job.webhookPath}`);

        // Call the n8n service
         // Use imported function
        // Update the job with the result
        job.responsePayload = await triggerWorkflow(job.webhookPath, job.requestPayload);
        job.status = 'completed';
        await job.save();

        logger.info(`ASYNC job ${job._id} completed successfully.`);

    } catch (error) {
        logger.error(`Failed to execute ASYNC job ${job._id}: ${error.message}`);

        // Check if it's our custom n8n error
        if (error instanceof N8nWorkflowError) {
            job.error = error.message;
            job.responsePayload = error.data; // Store the n8n error response
            job.status = 'failed';
        } else {
            // Update the job with the generic error
            job.error = error.message;
            job.status = 'failed';
        }
        await job.save();
    }
}

/**
 * Triggers a long-running n8n workflow WITHOUT waiting.
 * Returns a job ID to the client for status polling.
 */
async function triggerAsync(req, res) {
    const { payload } = req.body;
    const userId = req.user.id; // From authMiddleware

    if (!payload) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: payload.'
        });
    }

    try {
        // 1. Create the job in the database
        const job = await N8nWorkflowJob.create({
            userId,
            webhookPath: '/6ac4dc06-43b7-40a9-839c-fe2f9466579e',
            requestPayload: payload,
            status: 'processing', // Set to processing since we start immediately
        });

        // 2. Send an "Accepted" response to the client immediately
        res.status(202).json({
            success: true,
            message: 'Workflow accepted and is processing.',
            jobId: job._id,
        });

        // 3. Start the workflow in the background (DO NOT await this)
        await executeWorkflowAndUpdate(job);

    } catch (error) {
        logger.error(`Failed to create ASYNC workflow job: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Failed to initiate the workflow job.',
            error: error.message
        });
    }
}

/**
 * Gets the status and result of an asynchronous workflow job.
 */
async function getJobStatus(req, res) {
    const { id } = req.params;
    const userId = req.user.id; // From authMiddleware

    try {
        const job = await N8nWorkflowJob.findById(id);

        // Check 1: Job exists
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found.',
            });
        }

        // Check 2: User owns this job (SECURITY)
        if (job.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this job.',
            });
        }

        // Return the current state of the job
        return res.status(200).json({
            success: true,
            job: {
                jobId: job._id,
                status: job.status,
                result: job.responsePayload,
                error: job.error,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            },
        });

    } catch (error) {
        logger.error(`Failed to get job status for ${id}: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the job status.',
            error: error.message
        });
    }
}

module.exports = {
    triggerAsync,
    getJobStatus,
};
