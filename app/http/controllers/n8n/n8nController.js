const n8nService = require('../../../services/n8nService');

async function triggerAsync(req, res) {
    try {
        const job = await n8nService.initiateAsyncWorkflow(req.user.id, req.body.payload, '/6ac4dc06-43b7-40a9-839c-fe2f9466579e', 'ai-model');

        return res.status(202).json({
            success: true,
            message: 'Workflow accepted and is processing.',
            jobId: job._id,
        });
    } catch (error) {
        // Handle known service errors if you want specific 400 codes
        if (error instanceof n8nService.ServiceError && error.type === 'VALIDATION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        // Generic fallback
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function promptSubmission(req, res) {
    try {
        const job = await n8nService.initiateAsyncWorkflow(req.user.id, req.body.payload, '/217b07f3-a235-46da-8e9e-9fe760b7ae0a', 'prompt');

        return res.status(202).json({
            success: true,
            message: 'Workflow accepted and is processing.',
            jobId: job._id,
        });
    } catch (error) {
        // Handle known service errors if you want specific 400 codes
        if (error instanceof n8nService.ServiceError && error.type === 'VALIDATION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        // Generic fallback
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getJobStatus(req, res) {
    try {
        const jobStatus = await n8nService.getJobStatus(req.params.id, req.user.id);

        return res.status(200).json({
            success: true,
            job: jobStatus,
        });
    } catch (error) {
        // Handle specific service errors to return correct HTTP codes
        if (error instanceof n8nService.ServiceError) {
            switch (error.type) {
                case 'NOT_FOUND': return res.status(404).json({ success: false, message: error.message });
                case 'FORBIDDEN': return res.status(403).json({ success: false, message: error.message });
            }
        }
        // Generic fallback
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { triggerAsync, promptSubmission, getJobStatus };
