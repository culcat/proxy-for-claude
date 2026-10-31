/**
 * Google CloudCode Provider
 *
 * Wraps the existing Google CloudCode client to conform to the provider interface.
 * Handles account selection, rate limiting, and model routing for Google's backend.
 */

import { BaseProvider } from './provider-interface.js';
import { sendMessage, sendMessageStream, listModels } from '../cloudcode/index.js';
import { logger } from '../utils/logger.js';

export class GoogleProvider extends BaseProvider {
    /**
     * Create a new Google CloudCode provider
     * @param {Object} config - Provider configuration
     * @param {import('../account-manager/index.js').default} config.accountManager - Account manager instance
     */
    constructor(config = {}) {
        super('google', config);

        if (!config.accountManager) {
            throw new Error('GoogleProvider requires an accountManager in config');
        }

        this.accountManager = config.accountManager;
        this.fallbackEnabled = config.fallbackEnabled ?? false;
    }

    /**
     * Send a non-streaming message request
     * @param {Object} request - Anthropic-format request
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Anthropic-format response
     */
    async sendMessage(request, options = {}) {
        this.log('info', `Sending non-streaming request for model: ${request.model}`);

        try {
            const response = await sendMessage(
                request,
                this.accountManager,
                options.fallbackEnabled ?? this.fallbackEnabled
            );

            this.log('info', `Request completed successfully for model: ${request.model}`);
            return response;
        } catch (error) {
            this.log('error', `Request failed for model: ${request.model}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Send a streaming message request
     * @param {Object} request - Anthropic-format request
     * @param {Object} options - Additional options
     * @yields {Object} Anthropic-format SSE events
     */
    async *sendMessageStream(request, options = {}) {
        this.log('info', `Sending streaming request for model: ${request.model}`);

        try {
            yield* sendMessageStream(
                request,
                this.accountManager,
                options.fallbackEnabled ?? this.fallbackEnabled
            );

            this.log('info', `Streaming request completed for model: ${request.model}`);
        } catch (error) {
            this.log('error', `Streaming request failed for model: ${request.model}`, { error: error.message });
            throw error;
        }
    }

    /**
     * List available models from Google CloudCode
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of model objects
     */
    async listModels(options = {}) {
        this.log('info', 'Fetching available models from Google CloudCode');

        try {
            const models = await listModels(this.accountManager);
            this.log('info', `Retrieved ${models.length} models from Google CloudCode`);
            return models;
        } catch (error) {
            this.log('error', 'Failed to fetch models', { error: error.message });
            throw error;
        }
    }

    /**
     * Get health status of Google CloudCode provider
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        try {
            const accountCount = this.accountManager.getAccountCount();
            const availableAccounts = this.accountManager.getAvailableAccounts();
            const invalidAccounts = this.accountManager.getInvalidAccounts();

            const status = accountCount === 0 ? 'unhealthy' :
                          availableAccounts.length === 0 ? 'degraded' : 'healthy';

            return {
                provider: this.name,
                status,
                accounts: {
                    total: accountCount,
                    available: availableAccounts.length,
                    invalid: invalidAccounts.length
                },
                message: status === 'healthy' ?
                    `${availableAccounts.length} accounts available` :
                    status === 'degraded' ?
                    'All accounts rate-limited or cooling down' :
                    'No accounts configured'
            };
        } catch (error) {
            this.log('error', 'Health check failed', { error: error.message });
            return {
                provider: this.name,
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Check if this provider supports a given model
     * @param {string} modelName - Model identifier
     * @returns {boolean}
     */
    supportsModel(modelName) {
        // Google provider supports Gemini models and Claude models via CloudCode
        const googleModels = [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-2.0-flash-thinking-exp-01-21',
            'gemini-2.0-flash-thinking-exp',
            'gemini-thinking-exp-01-21',
            'gemini-2-0-flash-thinking-exp-1219',
            'gemini-2.0-flash-thinking',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ];

        const claudeModels = [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-sonnet-20240620',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229'
        ];

        const normalizedModel = modelName.toLowerCase();

        // Check exact matches first
        if (googleModels.some(m => normalizedModel === m.toLowerCase())) {
            return true;
        }

        if (claudeModels.some(m => normalizedModel === m.toLowerCase())) {
            return true;
        }

        // Check prefixes for flexibility
        if (normalizedModel.startsWith('gemini-')) {
            return true;
        }

        if (normalizedModel.startsWith('claude-')) {
            return true;
        }

        return false;
    }

    /**
     * Enable or disable fallback mode
     * @param {boolean} enabled
     */
    setFallbackEnabled(enabled) {
        this.fallbackEnabled = enabled;
        this.log('info', `Fallback mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

export default GoogleProvider;
