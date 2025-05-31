// app/strategies/grid/aiModel.js

/*
 * aiModel.js
 *
 * Implements an AI model (using TensorFlow.js) for optimizing grid parameters.
 *
 * Methods:
 *   - loadModel(): Loads a pre-trained model from disk; if not found, creates a new one.
 *   - createModel(): Creates and compiles a new TensorFlow model.
 *   - trainOnHistoricalData(historicalFeatures, historicalTargets, epochs):
 *         Trains the model on provided data.
 *   - predict(features): Runs inference on input features to output grid parameter suggestions.
 */

const tf     = require('@tensorflow/tfjs-node');
const logger = require('../../../logs/gridLogger');

class GridOptimizerModel {
    /**
     * @param {string} [modelPath]
     *  - File‐system path to model.json (e.g. './models/grid_optimizer_model/model.json').
     *  - If omitted, defaults to '<project_root>/models/grid_optimizer_model/model.json'.
     */
    constructor(modelPath) {
        this.modelPath = modelPath
            ? modelPath
            : `${process.cwd()}/models/grid_optimizer_model/model.json`;
        this.model = null;
        this.isTrained = false;
    }

    /**
     * Loads a pre‐trained model from disk (this.modelPath). If it fails,
     * creates a fresh model by calling createModel().
     */
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel(`file://${this.modelPath}`);
            logger.info({
                event: 'AI_MODEL_LOADED',
                modelPath: this.modelPath
            });
        } catch (err) {
            logger.error({
                event: 'AI_MODEL_LOAD_ERROR',
                error: err.message
            });
            this.model = this.createModel();
            logger.info({ event: 'AI_MODEL_CREATED' });
        }
    }

    /**
     * Creates and compiles a brand‐new TF.js Sequential model.
     *
     * Input shape: [6] → [price, volatility, trend, openOrders, hurst, adx]
     * Output: 5 units → [gridCount, gridStepPercentage, takeProfitPct, stopLossPct, volatilityBasedSLProb]
     */
    createModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({
            inputShape: [6],
            units:      32,
            activation: 'relu'
        }));
        model.add(tf.layers.dense({
            units:      32,
            activation: 'relu'
        }));
        // Final layer: 5 outputs (linear activation)
        model.add(tf.layers.dense({
            units:      5,
            activation: 'linear'
        }));
        model.compile({
            loss:      'meanSquaredError',
            optimizer: 'adam'
        });
        return model;
    }

    /**
     * Trains the model on historical features & targets.
     *
     * @param {Array<Array<number>>} historicalFeatures
     *   - Each subarray = [price, volatility, trend, openOrders, hurst, adx]
     *   - Shape: [numSamples, 6]
     *
     * @param {Array<Array<number>>} historicalTargets
     *   - Each subarray = [gridCount, gridStepPercentage, takeProfitPct, stopLossPct, volBasedSLProb]
     *   - Shape: [numSamples, 5]
     *
     * @param {number} [epochs=10]
     */
    async trainOnHistoricalData(historicalFeatures, historicalTargets, epochs = 10) {
        if (!this.model) {
            await this.loadModel();
        }

        // Convert arrays into Tensors
        const xs = tf.tensor2d(historicalFeatures); // shape: [N, 6]
        const ys = tf.tensor2d(historicalTargets);  // shape: [N, 5]

        try {
            await this.model.fit(xs, ys, {
                epochs,
                batchSize: 32
            });
            this.isTrained = true;

            // Save model artifacts (model.json + weights) to disk
            const saveDir = this.modelPath.substring(0, this.modelPath.lastIndexOf('/'));
            await this.model.save(`file://${saveDir}`);
            logger.info({
                event: 'AI_MODEL_TRAINED',
                epochs,
                samples: historicalFeatures.length,
                saveDir
            });
        } catch (err) {
            logger.error({
                event: 'AI_MODEL_TRAIN_ERROR',
                error: err.message
            });
            throw err;
        }
    }

    /**
     * Runs inference on a single feature vector:
     *   { price, volatility, trend, openOrders, hurst, adx }
     *
     * Returns:
     *   {
     *     gridCount: <integer>,
     *     gridStepPercentage: <number>,
     *     takeProfitPct: <number>,
     *     stopLossPct: <number>,
     *     volatilityBasedSL: <boolean>
     *   }
     */
    async predict(features) {
        if (!this.model) {
            await this.loadModel();
        }

        // Build an array of length 6
        const inputArray = [
            features.price        || 0,
            features.volatility   || 0,
            features.trend        || 0,
            features.openOrders   || 0,
            features.hurst        || 0,
            features.adx          || 0
        ];

        const inputTensor = tf.tensor2d([inputArray]); // shape: [1, 6]
        let predictionTensor;
        try {
            predictionTensor = this.model.predict(inputTensor);
        } catch (err) {
            logger.error({
                event: 'AI_MODEL_PREDICT_ERROR',
                error: err.message
            });
            throw err;
        }

        const prediction = predictionTensor.dataSync(); // length = 5
        const suggestedGridCount = Math.max(1, Math.round(prediction[0]));
        const suggestedGridStepPercentage = prediction[1];
        const suggestedTP = prediction[2];
        const suggestedSL = prediction[3];
        const suggestedVolatilityBasedSL = prediction[4] > 0.5;

        const suggestion = {
            gridCount: suggestedGridCount,
            gridStepPercentage: suggestedGridStepPercentage,
            takeProfitPct: suggestedTP,
            stopLossPct: suggestedSL,
            volatilityBasedSL: suggestedVolatilityBasedSL
        };

        logger.info({
            event: 'AI_MODEL_PREDICT',
            features,
            suggestion
        });

        return suggestion;
    }
}

module.exports = GridOptimizerModel;
