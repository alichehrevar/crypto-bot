// services/n8n/startN8nListener.js  (CommonJS)

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
 * Why your old service often "doesn't work" with the record you pasted:
 * - n8n writes `response: { ... }` (an OBJECT) but your schema defines `response` as ObjectId ref,
 *   so Mongoose can throw casting errors when reading docs.
 * - n8n inserts docs without `status`, so querying {status:"pending"} returns nothing.
 * - n8n inserts docs without required fields (userId, webhookPath, etc), so calling `doc.save()`
 *   can fail validation. This service uses RAW collection updates for the n8n DB to avoid that.
 */

const POLL_INTERVAL_MS = 3000;
const BATCH_SIZE = 5;

const WORKER_ID = `n8n-sync:${process.pid}:${Date.now()}`;

// If your main response schema requires these fileIds, keep true.
// (Your generatedCode & balanceSketch exist in your sample, so it’s fine.)
const FORCE_GRIDFS_IDS = true;

let intervalId = null;
let tickRunning = false;

// ---------- helpers ----------
function waitForConn(conn, label) {
    if (conn.readyState === 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const onOpen = () => {
            cleanup();
            resolve();
        };
        const onErr = (e) => {
            cleanup();
            reject(e);
        };
        const cleanup = () => {
            conn.off("open", onOpen);
            conn.off("error", onErr);
        };
        conn.once("open", onOpen);
        conn.once("error", onErr);
    }).catch((e) => {
        console.error(`❌ [N8nListener] Failed connecting to ${label}:`, e);
        throw e;
    });
}

function stringToStream(str) {
    const s = new Readable();
    s.push(str);
    s.push(null);
    return s;
}

function cleanSvgString(raw) {
    if (!raw) return "";
    return String(raw).replace(/```svg/g, "").replace(/```/g, "").trim();
}

async function uploadToGridFS(content, filename) {
    const hasContent = content !== undefined && content !== null;

    if (!hasContent && !FORCE_GRIDFS_IDS) return null;

    const db = mongoose.connection?.db;
    if (!db) throw new Error("Main DB not ready (mongoose.connection.db missing).");

    const bucket = new GridFSBucket(db, { bucketName: "n8n_blobs" });
    const finalContent = hasContent ? String(content) : ""; // allow empty if forced

    return new Promise((resolve, reject) => {
        const up = bucket.openUploadStream(filename);
        up.on("error", reject);
        up.on("finish", () => resolve(up.id));
        stringToStream(finalContent).pipe(up);
    });
}

/**
 * n8n record you pasted: { _id, response: { status, requestID, ... } }
 * We support both patterns:
 * - responsePayload (if you later switch)
 * - response (your current n8n output)
 */
function pickResponse(doc) {
    return doc?.responsePayload || doc?.response || null;
}

/**
 * Try to find the parent job in main DB.
 * Best case: you reuse the same _id across DBs (your old logic).
 * Fallback: search by requestID in a few likely paths.
 */
async function findParentJob({ n8nDocId, requestID }) {
    // 1) best-case (your original assumption)
    let parent = await CustomAIWorkflowJob_DefaultDB.findById(n8nDocId);
    if (parent) return parent;

    // 2) fallback: requestID stored somewhere inside requestPayload
    // (Mixed type allows dot-notation queries, but it’s not indexed unless you add one.)
    parent = await CustomAIWorkflowJob_DefaultDB.findOne({
        $or: [
            { "requestPayload.requestID": requestID },
            { "requestPayload.requestId": requestID },
            { "requestPayload.response.requestID": requestID },
            { "requestPayload.input.requestID": requestID },
            { "requestPayload.input.requestId": requestID },
        ],
    });

    return parent;
}

// ---------- raw n8n db access ----------
function getN8nCollection() {
    // Use the same collection name Mongoose model points to, but via native driver.
    const name = N8nWorkflowJob_CustomAiDB.collection.name;
    return customAiDbConnection.db.collection(name);
}

/**
 * Claim one job atomically from n8n DB.
 * Important: we treat missing status as pending because n8n inserts raw docs.
 * Also: we only process docs that already have response.requestID (your sample).
 */
async function claimOne() {
    const col = getN8nCollection();

    const filter = {
        $and: [
            { $or: [{ status: "pending" }, { status: { $exists: false } }] },
            { $or: [{ syncedAt: { $exists: false } }, { syncedAt: null }] },
            {
                $or: [
                    { "response.requestID": { $exists: true, $ne: null } },
                    { "responsePayload.requestID": { $exists: true, $ne: null } },
                ],
            },
        ],
    };

    const update = {
        $set: {
            status: "processing",
            claimedAt: new Date(),
            workerId: WORKER_ID,
        },
    };

    // sort by createdAt if available, else _id
    const opts = {
        sort: { createdAt: 1, _id: 1 },
        returnDocument: "after",
    };

    const res = await col.findOneAndUpdate(filter, update, opts);
    return res && res.value ? res.value : null;
}

async function markN8nCompleted({ n8nId, mainJobId, mainResponseId }) {
    const col = getN8nCollection();
    await col.updateOne(
        { _id: n8nId },
        {
            $set: {
                status: "completed",
                syncedAt: new Date(),
                mainJobId: mainJobId || null,
                mainResponseId: mainResponseId || null,
                error: null,
            },
        }
    );
}

async function markN8nFailed({ n8nId, message }) {
    const col = getN8nCollection();
    await col.updateOne(
        { _id: n8nId },
        {
            $set: {
                status: "failed",
                failedAt: new Date(),
                error: message || "Unknown error",
            },
        }
    );
}

// ---------- core processing ----------
async function processOne(n8nDoc) {
    const n8nId = n8nDoc._id;
    const data = pickResponse(n8nDoc);

    if (!data) {
        await markN8nFailed({ n8nId, message: "Missing response/responsePayload" });
        return;
    }

    const requestID = data.requestID || data.requestId;
    if (!requestID) {
        await markN8nFailed({ n8nId, message: "Missing response.requestID" });
        return;
    }

    // Locate parent job in MAIN DB
    const parentJob = await findParentJob({ n8nDocId: n8nId, requestID });
    if (!parentJob) {
        await markN8nFailed({
            n8nId,
            message: `Parent job not found in main DB (requestID=${requestID})`,
        });
        return;
    }

    // If already completed, just mark n8n as synced and stop
    if (parentJob.status === "completed" && parentJob.response) {
        await markN8nCompleted({
            n8nId,
            mainJobId: parentJob._id,
            mainResponseId: parentJob.response,
        });
        return;
    }

    try {
        // Upload code + SVG blobs to GridFS in MAIN db
        const codeStr = data.generatedCode?.code ?? null;
        const svgStr = data.backtest?.balanceSketch ?? null;

        const codeFileId = await uploadToGridFS(codeStr, `code-${requestID}.js`);
        const svgFileId = await uploadToGridFS(
            cleanSvgString(svgStr),
            `balance-${requestID}.svg`
        );

        // Parse tradeLog (your sample has it as JSON string)
        let tradeLog = [];
        const tl = data.backtest?.tradeLog;
        if (typeof tl === "string") {
            try {
                tradeLog = JSON.parse(tl);
            } catch (_) {
                tradeLog = [];
            }
        } else if (Array.isArray(tl)) {
            tradeLog = tl;
        }

        // Idempotence: if a response with same (jobId, requestID) exists, reuse it
        let existing = await CustomAIJobResponse_DefaultDB.findOne({
            jobId: parentJob._id,
            requestID,
        });

        if (!existing) {
            existing = await new CustomAIJobResponse_DefaultDB({
                jobId: parentJob._id,
                status: data.status,
                requestID,
                attempt: data.attempt,
                input: data.input,
                modelUsed: data.modelUsed || "unknown",
                generatedCode: {
                    summary: data.generatedCode?.summary,
                    generatedCodeFileId: codeFileId,
                    fullCode: codeStr || undefined,
                },
                backtest: {
                    ...(data.backtest || {}),
                    tradeLog,
                    balanceSketchFileId: svgFileId,
                    fullBalanceSketch: cleanSvgString(svgStr) || undefined,
                },
                error: data.errorMessage || data.error || null,
            }).save();
        } else {
            // if you want to update existing response from a retry, do it here:
            existing.status = data.status;
            existing.attempt = data.attempt;
            existing.input = data.input;
            existing.modelUsed = data.modelUsed || existing.modelUsed;
            existing.generatedCode = {
                summary: data.generatedCode?.summary,
                generatedCodeFileId: codeFileId,
                fullCode: codeStr || existing.generatedCode?.fullCode,
            };
            existing.backtest = {
                ...(data.backtest || {}),
                tradeLog,
                balanceSketchFileId: svgFileId,
                fullBalanceSketch: cleanSvgString(svgStr) || existing.backtest?.fullBalanceSketch,
            };
            existing.error = data.errorMessage || data.error || null;
            await existing.save();
        }

        parentJob.status = "completed";
        parentJob.response = existing._id;
        await parentJob.save();

        await markN8nCompleted({
            n8nId,
            mainJobId: parentJob._id,
            mainResponseId: existing._id,
        });

        console.log(
            `✅ [N8nListener] Synced n8n:${String(n8nId)} -> mainJob:${String(
                parentJob._id
            )} response:${String(existing._id)}`
        );
    } catch (e) {
        console.error(`❌ [N8nListener] process failed for ${String(n8nId)}:`, e);
        await markN8nFailed({ n8nId, message: e.message });
    }
}

// ---------- public API ----------
async function startN8nListener() {
    console.log("🔵 [N8nListener] start called");

    if (intervalId) {
        console.log("🟡 [N8nListener] already running");
        return;
    }

    await waitForConn(customAiDbConnection, "CustomAI (n8n) DB");
    await waitForConn(mongoose.connection, "Main DB");

    const colName = N8nWorkflowJob_CustomAiDB.collection.name;
    console.log(`🟢 [N8nListener] connected. raw polling from collection "${colName}"`);

    intervalId = setInterval(async () => {
        if (tickRunning) return;
        tickRunning = true;

        try {
            for (let i = 0; i < BATCH_SIZE; i++) {
                const claimed = await claimOne();
                if (!claimed) break;
                await processOne(claimed);
            }
        } catch (e) {
            console.error("❌ [N8nListener] tick error:", e);
        } finally {
            tickRunning = false;
        }
    }, POLL_INTERVAL_MS);
}

function stopN8nListener() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    tickRunning = false;
    console.log("🛑 [N8nListener] stopped");
}

module.exports = { startN8nListener, stopN8nListener };
