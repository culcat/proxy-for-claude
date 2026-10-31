/**
 * Base Provider Interface
 *
 * Abstract base class that defines the contract all providers must implement.
 * Providers wrap backend services (Google CloudCode, Omniroute, etc.) with
 * a unified interface for the router.
 */

import { logger } from '../utils/logger.js';

export class BaseProvider {
    /**
     * Create a new provider instance
     * @param {string} name - Provider name for logging
     * @param {Object} config - Provider-specific configuration
     */
    constructor(name = 'base', config = {}) {
        this._name = name;
        this._config = config;
    }

    /**
     * Get the provider name
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * Get provider configuration
     * @returns {Object}
     */
    get config() {
        return this._config;
    }

    /**
     * Send a non-streaming message request
     * @param {Object} request - Anthropic-format request
     * @param {Object} options - Additional options (account info, etc.)
     * @returns {Promise<Object>} Anthropic-format response
     * @throws {Error} Must be implemented by subclass
     */
    async sendMessage(request, options = {}) {
        throw new Error(`sendMessage() not implemented by ${this.name} provider`);
    }

    /**
     * Send a streaming message request
     * @param {Object} request - Anthropic-format request
     * @param {Object} options - Additional options (account info, etc.)
     * @yields {Object} Anthropic-format SSE events
     * @throws {Error} Must be implemented by subclass
     */
    async *sendMessageStream(request, options = {}) {
        throw new Error(`sendMessageStream() not implemented by ${this.name} provider`);
    }

    /**
     * List available models from this provider
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of model objects
     * @throws {Error} Must be implemented by subclass
     */
    async listModels(options = {}) {
        throw new Error(`listModels() not implemented by ${this.name} provider`);
    }

    /**
     * Get health status of this provider
     * @returns {Promise<Object>} Health status object
     */
    async getHealth() {
        return {
            provider: this.name,
            status: 'unknown',
            message: 'Health check not implemented'
        };
    }

    /**
     * Check if this provider supports a given model
     * @param {string} modelName - Model identifier
     * @returns {boolean}
     */
    supportsModel(modelName) {
        logger.warn(`[${this.name}] supportsModel() not implemented, defaulting to false`);
        return false;
    }

    /**
     * Log provider activity
     * @param {string} level - Log level (info, warn, error)
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    log(level, message, meta = {}) {
        const logMessage = `[${this.name} Provider] ${message}`;
        logger[level]?.(logMessage, meta);
    }
}

export default BaseProvider;
