const { N8nJobResponse_CustomAiDB } = require('../../../models/N8nJobResponse');
const { N8nWorkflowJob_CustomAiDB } = require('../../../models/N8nWorkflowJob');

/**
 * Fetches the top 20 N8nJobResponse documents sorted by the highest ROI.
 * It uses an aggregation pipeline to convert the string ROI field to a number
 * for accurate sorting and joins the parent N8nWorkflowJob for context.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getTopRoiJobs (req, res) {
    try {
        // We need the collection name of the parent job for the $lookup stage.
        const parentCollectionName = N8nWorkflowJob_CustomAiDB.collection.collectionName;

        const topJobs = await N8nJobResponse_CustomAiDB.aggregate([
            // 1. Convert the string ROI (e.g., "1.234") to a numerical type for proper sorting.
            {
                $addFields: {
                    // FIX: Use $convert with onError to handle non-numeric strings like "N/A"
                    numericRoi: {
                        $convert: {
                            input: "$backtest.roi",
                            to: "double",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            },

            // 2. Sort by the new numerical ROI field in descending order.
            {
                $sort: {
                    numericRoi: -1, // Highest ROI first
                    _id: -1, // Secondary sort key for consistent ordering
                }
            },

            // 3. Limit the result set to the top 20 documents.
            { $limit: 21 },

            // 4. Join the parent N8nWorkflowJob document for job context (who ran it, the prompt, status).
            {
                $lookup: {
                    from: parentCollectionName, // Target collection name (e.g., 'n8nworkflowjobs')
                    localField: 'jobId',        // Field on N8nJobResponse (child)
                    foreignField: '_id',        // Field on N8nWorkflowJob (parent)
                    as: 'parentJob',            // Output array field name
                }
            },

            // 5. Unwind the parentJob array.
            {
                $unwind: {
                    path: '$parentJob',
                    preserveNullAndEmptyArrays: true,
                }
            },

            // 6. Merge the entire child document (the current root) with the parent job data.
            // This effectively returns all fields from both the N8nJobResponse and the N8nWorkflowJob.
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$$ROOT", // The N8nJobResponse document
                            { parentJob: "$parentJob" } // The parent job data
                        ]
                    }
                }
            },

            // 7. Optional cleanup: Remove the temporary numericRoi field used only for sorting.
            {
                $project: {
                    numericRoi: 0,
                    // The rest of the fields from the merged document will be included by default
                }
            }
        ]);

        if (topJobs.length === 0) {
            return res.status(404).json({ message: 'No completed jobs found to rank by ROI.', success: false });
        }

        return res.status(200).json({ data: topJobs, success: true });

    } catch (error) {
        console.error('Error fetching top ROI jobs:', error);
        return res.status(500).json({
            message: 'Failed to fetch top ROI data due to a server error.',
            error: error.message,
            success: false
        });
    }
}

module.exports = { getTopRoiJobs };
