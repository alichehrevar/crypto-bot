// services/n8n/startN8nListener.js (CommonJS)

const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const { Readable } = require("stream");

const customAiDbConnection = require("../../config/customAiDb");
const {
    N8nWorkflowJob_CustomAiDB,
    CustomAIWorkflowJob_DefaultDB,
} = require("../models/N8nWorkflowJob");
const { CustomAIJobResponse_DefaultDB } = require("../models/N8nJobResponse");

/**
 * CONFIG
 */
const POLL_INTERVAL_MS = 5000;
const BATCH_SIZE = 5;

// If your response schema requires GridFS ids, keep this true.
// If it allows null file ids, set false.
const FORCE_GRIDFS_IDS = true;

/**
 * INTERNAL STATE
 */
let intervalId = null;
let isTickRunning = false;

/**
 * Helpers
 */
function waitForConnection(conn, label = "db") {
    if (conn.readyState === 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const onOpen = () => {
            cleanup();
            resolve();
        };
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        const cleanup = () => {
            conn.off("open", onOpen);
            conn.off("error", onError);
        };
        conn.once("open", onOpen);
        conn.once("error", onError);
    }).catch((err) => {
        console.error(`❌ [N8n Listener] Failed to connect to ${label}:`, err);
        throw err;
    });
}

function stringToStream(str) {
    const stream = new Readable();
    stream.push(str);
    stream.push(null);
    return stream;
}

function cleanSvgString(raw) {
    if (!raw) return "";
    return String(raw).replace(/```svg/g, "").replace(/```/g, "").trim();
}

async function uploadToGridFS({ filename, content }) {
    const hasContent = content !== undefined && content !== null;
    if (!hasContent && !FORCE_GRIDFS_IDS) return null;

    const finalContent = hasContent ? String(content) : ""; // allow 0-byte file if forced
    const db = mongoose.connection?.db;
    if (!db) throw new Error("Main mongoose connection has no db handle yet.");

    const bucket = new GridFSBucket(db, { bucketName: "n8n_blobs" });

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename);

        uploadStream.on("error", reject);
        uploadStream.on("finish", () => resolve(uploadStream.id));

        stringToStream(finalContent).pipe(uploadStream);
    });
}

/**
 * Extract payloads robustly (because your schema/model naming may differ)
 */
function getPayloads(n8nRecord) {
    // Most likely correct (per your schema naming): requestPayload/responsePayload
    const requestPayload =
        n8nRecord.requestPayload ||
        n8nRecord.request ||
        n8nRecord.input ||
        null;

    const responsePayload =
        n8nRecord.responsePayload ||
        n8nRecord.response || // <-- your old code used this; keep as fallback
        n8nRecord.output ||
        null;

    return { requestPayload, responsePayload };
}

/**
 * Atomically claim one pending job (prevents double-processing across instances)
 */
async function claimNextPendingJob() {
    return N8nWorkflowJob_CustomAiDB.findOneAndUpdate(
        { status: "pending" },
        { $set: { status: "processing", processingAt: new Date() } },
        { sort: { createdAt: 1 }, new: true }
    );
}

/**
 * Main exported start function
 */
async function startN8nListener() {
    console.log("🔵 [N8n Listener] startN8nListener() called.");

    if (intervalId) {
        console.log("🟡 [N8n Listener] Listener already running. Skipping.");
        return;
    }

    // Ensure BOTH connections are ready:
    // - customAiDbConnection (n8n db)
    // - mongoose.connection (main db, needed for GridFS + main models)
    console.log(
        `🔵 [N8n Listener] Custom DB readyState: ${customAiDbConnection.readyState} (0=D/C, 1=Conn, 2=Conn-ing)`
    );
    console.log(
        `🔵 [N8n Listener] Main   DB readyState: ${mongoose.connection.readyState} (0=D/C, 1=Conn, 2=Conn-ing)`
    );

    await waitForConnection(customAiDbConnection, "CustomAI (n8n) DB");
    await waitForConnection(mongoose.connection, "Main (default) DB");

    const collectionName = N8nWorkflowJob_CustomAiDB.collection.name;
    console.log(`✅ [N8n Listener] Connected. Watching collection: "${collectionName}"`);

    // Optional visibility check
    try {
        const total = await N8nWorkflowJob_CustomAiDB.countDocuments({});
        const pending = await N8nWorkflowJob_CustomAiDB.countDocuments({ status: "pending" });
        console.log(`📊 [N8n Listener] Total docs: ${total} | Pending: ${pending}`);
    } catch (e) {
        console.warn("⚠️ [N8n Listener] Could not count docs:", e.message);
    }

    intervalId = setInterval(async () => {
        if (isTickRunning) return;
        isTickRunning = true;
        try {
            await tick();
        } catch (err) {
            console.error("❌ [N8n Listener] Tick error:", err);
        } finally {
            isTickRunning = false;
        }
    }, POLL_INTERVAL_MS);

    console.log(`🟢 [N8n Listener] Polling every ${POLL_INTERVAL_MS}ms`);
}

/**
 * One poll tick: process up to BATCH_SIZE jobs
 */
async function tick() {
    for (let i = 0; i < BATCH_SIZE; i++) {
        const job = await claimNextPendingJob();
        if (!job) return; // no more pending
        await processClaimedJob(job);
    }
}

/**
 * Process one claimed job (status already set to processing)
 */
async function processClaimedJob(n8nRecord) {
    const recordId = String(n8nRecord._id);
    console.log(`⚙️ [N8n Listener] Processing n8n record: ${recordId}`);

    const { requestPayload, responsePayload } = getPayloads(n8nRecord);

    // Request/Response correlation
    const requestID = responsePayload?.requestID || responsePayload?.requestId || null;

    // IMPORTANT: cross-db _id matching usually fails; use a stored parentJobId
    const parentJobId =
        requestPayload?.parentJobId ||
        requestPayload?.jobId ||
        responsePayload?.parentJobId ||
        responsePayload?.jobId ||
        null;

    if (!responsePayload) {
        await failN8nRecord(n8nRecord, "Missing responsePayload/response");
        return;
    }

    if (!requestID) {
        await failN8nRecord(n8nRecord, "Missing responsePayload.requestID");
        return;
    }

    if (!parentJobId) {
        await failN8nRecord(
            n8nRecord,
            "Missing parentJobId. Store it in requestPayload.parentJobId when creating the n8n record."
        );
        return;
    }

    // Find the parent job in MAIN DB
    const parentJob = await CustomAIWorkflowJob_DefaultDB.findById(parentJobId);
    if (!parentJob) {
        await failN8nRecord(n8nRecord, `Parent job not found in main DB: ${parentJobId}`);
        return;
    }

    try {
        // Upload blobs to GridFS (in MAIN DB)
        const codeStr = responsePayload.generatedCode?.code ?? responsePayload.code ?? null;
        const svgStr =
            responsePayload.backtest?.balanceSketch ??
            responsePayload.balanceSketch ??
            null;

        const codeFileId = await uploadToGridFS({
            filename: `code-${requestID}.js`,
            content: codeStr,
        });

        const svgFileId = await uploadToGridFS({
            filename: `balance-${requestID}.svg`,
            content: cleanSvgString(svgStr),
        });

        // Parse trade log safely
        let tradeLog = [];
        const tl = responsePayload.backtest?.tradeLog;
        if (typeof tl === "string") {
            try {
                tradeLog = JSON.parse(tl);
            } catch (_) {
                tradeLog = [];
            }
        } else if (Array.isArray(tl)) {
            tradeLog = tl;
        }

        // Build the response doc in MAIN DB
        const responseDoc = new CustomAIJobResponse_DefaultDB({
            jobId: parentJob._id,
            status: responsePayload.status ?? "completed",
            requestID,
            attempt: responsePayload.attempt,
            input: responsePayload.input ?? requestPayload,

            // Prefer actual value if provided by n8n
            modelUsed: responsePayload.modelUsed ?? "unknown",

            generatedCode: {
                summary: responsePayload.generatedCode?.summary,
                generatedCodeFileId: codeFileId,
                fullCode: codeStr ?? undefined,
            },

            backtest: {
                ...(responsePayload.backtest || {}),
                tradeLog,
                balanceSketchFileId: svgFileId,
                fullBalanceSketch: cleanSvgString(svgStr) || undefined,
            },

            error: responsePayload.error ?? null,
        });

        const savedResponse = await responseDoc.save();

        // Update parent job
        parentJob.status = "completed";
        parentJob.response = savedResponse._id;
        await parentJob.save();

        // Mark n8n record completed
        n8nRecord.status = "completed";
        n8nRecord.completedAt = new Date();
        n8nRecord.error = null;
        await n8nRecord.save();

        console.log(`✅ [N8n Listener] Synced OK | n8n:${recordId} -> main:${parentJob._id}`);
    } catch (err) {
        await failN8nRecord(n8nRecord, err.message || String(err));
        console.error(`❌ [N8n Listener] Failed processing ${recordId}:`, err);
    }
}

async function failN8nRecord(n8nRecord, message) {
    n8nRecord.status = "failed";
    n8nRecord.error = message;
    n8nRecord.failedAt = new Date();
    try {
        await n8nRecord.save();
    } catch (e) {
        console.error("❌ [N8n Listener] Could not save failed status:", e.message);
    }
    console.warn(`⚠️ [N8n Listener] Marked failed: ${String(n8nRecord._id)} | ${message}`);
}

/**
 * Optional stop (useful in tests / graceful shutdown)
 */
function stopN8nListener() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    isTickRunning = false;
    console.log("🛑 [N8n Listener] stopped");
}

module.exports = { startN8nListener, stopN8nListener };
