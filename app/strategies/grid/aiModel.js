/*
 * aiModel.js
 *
 * Implements an AI model (using TensorFlow.js) for optimizing grid parameters.
 *
 * Methods:
 *   - loadModel(): Loads a pre-trained model from disk; if not found, creates a new one.
 *     IO: No input; Output: Loads/sets this.model.
 *   - createModel(): Creates and compiles a new TensorFlow model.
 *     IO: No input; Output: Returns a new model instance.
 *   - trainOnHistoricalData(historicalFeatures, historicalTargets, epochs):
 *         Trains the model on provided data.
 *     IO:
 *       Input: historicalFeatures (Array of feature arrays), historicalTargets (Array of target arrays), optional epochs (Number).
 *       Output: Trains the model and saves it.
 *   - predict(features): Runs inference on input features to output grid parameter suggestions.
 *     IO:
 *       Input: features object (e.g., { price, volatility, trend, openOrders, hurst, adx }).
 *       Output: Suggestion object with gridCount, gridStepPercentage, takeProfitPct, stopLossPct, and volatilityBasedSL.
 */

const tf = require('@tensorflow/tfjs-node');
const logger = require('../../../logs/gridLogger');

class GridOptimizerModel {
    constructor(modelPath) {
        // IO: Input: Optional modelPath string.
        // Sets modelPath and initializes model properties.
        this.modelPath = modelPath || './models/grid_optimizer_model/model.json';
        this.model = null;
        this.isTrained = false;
    }

    async loadModel() {
        // IO: No input; Output: Loads the model from file system or creates a new one.
        try {
            this.model = await tf.loadLayersModel(`file://${this.modelPath}`);
            logger.info({ event: 'AI_MODEL_LOADED', modelPath: this.modelPath });
        } catch (err) {
            logger.error({ event: 'AI_MODEL_LOAD_ERROR', error: err.message });
            this.model = this.createModel();
            logger.info({ event: 'AI_MODEL_CREATED' });
        }
    }

    createModel() {
        // IO: No input; Output: Returns a newly created TensorFlow sequential model.
        const model = tf.sequential();
        // Input shape [6]: price, volatility, trend, openOrders, hurst, adx.
        model.add(tf.layers.dense({ inputShape: [6], units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        // Output: 5 values corresponding to gridCount, gridStepPercentage, TP, SL, and volatilityBasedSL probability.
        model.add(tf.layers.dense({ units: 5, activation: 'linear' }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });
        return model;
    }

    async trainOnHistoricalData(historicalFeatures, historicalTargets, epochs = 10) {
        // IO:
        //   Input: historicalFeatures (Array), historicalTargets (Array), epochs (Number).
        //   Output: Trains the model and saves it to disk.
        if (!this.model) {
            await this.loadModel();
        }
        // Create tensors from the historical data.
        const xs = tf.tensor2d(historicalFeatures); // shape: [numSamples, 6]
        const ys = tf.tensor2d(historicalTargets);  // shape: [numSamples, 5]
        await this.model.fit(xs, ys, { epochs, batchSize: 32 });
        this.isTrained = true;
        await this.model.save(`file://${this.modelPath.substring(0, this.modelPath.lastIndexOf('/'))}`);
        logger.info({ event: 'AI_MODEL_TRAINED', epochs, samples: historicalFeatures.length });
    }

    async predict(features) {
        // IO:
        //   Input: features object with properties: price, volatility, trend, openOrders, hurst, adx.
        //   Output: Suggestion object with optimized grid parameters.
        if (!this.model) {
            await this.loadModel();
        }
        const inputArray = [
            features.price,
            features.volatility,
            features.trend,
            features.openOrders,
            features.hurst || 0,
            features.adx || 0
        ];
        const inputTensor = tf.tensor2d([inputArray]);
        const predictionTensor = this.model.predict(inputTensor);
        const prediction = predictionTensor.dataSync();
        const suggestedGridCount = Math.round(prediction[0]);
        const suggestedGridStepPercentage = prediction[1];
        const suggestedTP = prediction[2];
        const suggestedSL = prediction[3];
        const suggestedVolatilityBasedSL = prediction[4] > 0.5;
        logger.info({
            event: 'AI_MODEL_PREDICT',
            features,
            suggestion: {
                gridCount: suggestedGridCount,
                gridStepPercentage: suggestedGridStepPercentage,
                takeProfitPct: suggestedTP,
                stopLossPct: suggestedSL,
                volatilityBasedSL: suggestedVolatilityBasedSL
            }
        });
        return {
            gridCount: suggestedGridCount,
            gridStepPercentage: suggestedGridStepPercentage,
            takeProfitPct: suggestedTP,
            stopLossPct: suggestedSL,
            volatilityBasedSL: suggestedVolatilityBasedSL
        };
    }
}

module.exports = GridOptimizerModel;
