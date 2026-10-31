/**
 * Provider Router
 *
 * Main routing logic that selects the appropriate provider for each request
 * based on model patterns, configuration, and fallback chains.
 */

import { createProvider } from './provider-factory.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

/**
 * Provider Router
 * Handles routing requests to appropriate providers with fallback support
 */
export class ProviderRouter {
    /**
     * Create a new provider router
     * @param {Object} options - Router configuration
     * @param {Object} options.accountManager - Account manager instance (required for Google provider)
     * @param {Array} options.providers - Array of provider configurations
     * @param {Array} options.routingRules - Array of routing rules for model pattern matching
     * @param {boolean} options.fallbackEnabled - Enable fallback to alternate providers
     */
    constructor(options = {}) {
        this.accountManager = options.accountManager;
        this.fallbackEnabled = options.fallbackEnabled ?? false;

        // Initialize providers from configuration
        this.providers = new Map();
        this._initializeProviders(options.providers || []);

        // Routing rules: array of { pattern, provider, fallback }
        this.routingRules = options.routingRules || [];

        // Default provider (fallback when no rule matches)
        this.defaultProvider = options.defaultProvider || 'google';
    }

    /**
     * Initialize provider instances
     * @private
     */
    _initializeProviders(providerConfigs) {
        // Always initialize Google provider if accountManager is available
        if (this.accountManager) {
            try {
                const googleProvider = createProvider('google', {
                    accountManager: this.accountManager,
                    fallbackEnabled: this.fallbackEnabled
                });
                this.providers.set('google', googleProvider);
                logger.info('[Router] Google provider initialized');
            } catch (error) {
                logger.error('[Router] Failed to initialize Google provider:', error);
            }
        }

        // Initialize other configured providers
        for (const providerConfig of providerConfigs) {
            const { type, name, config: providerSpecificConfig } = providerConfig;
            const providerName = name || type;

            if (providerName === 'google') {
                continue; // Already initialized above
            }

            try {
                const provider = createProvider(type, providerSpecificConfig);
                this.providers.set(providerName, provider);
                logger.info(`[Router] ${providerName} provider initialized`);
            } catch (error) {
                logger.error(`[Router] Failed to initialize ${providerName} provider:`, error);
            }
        }
    }

    /**
     * Get the appropriate provider for a given model
     * @param {string} modelName - Model identifier
     * @returns {Object} { provider, fallbackProvider }
     */
    selectProvider(modelName) {
        // Check routing rules first
        for (const rule of this.routingRules) {
            if (this._matchesPattern(modelName, rule.pattern)) {
                const provider = this.providers.get(rule.provider);
                const fallbackProvider = rule.fallback ? this.providers.get(rule.fallback) : null;

                if (provider) {
                    logger.debug(`[Router] Matched rule for ${modelName} -> ${rule.provider}`);
                    return { provider, fallbackProvider };
                }
            }
        }

        // Check which providers support this model
        for (const [name, provider] of this.providers.entries()) {
            if (provider.supportsModel(modelName)) {
                logger.debug(`[Router] Provider ${name} supports ${modelName}`);
                return { provider, fallbackProvider: null };
            }
        }

        // Fall back to default provider
        const defaultProv = this.providers.get(this.defaultProvider);
        if (defaultProv) {
            logger.debug(`[Router] Using default provider ${this.defaultProvider} for ${modelName}`);
            return { provider: defaultProv, fallbackProvider: null };
        }

        throw new Error(`No provider available for model: ${modelName}`);
    }

    /**
     * Match a model name against a pattern (supports glob-style wildcards)
     * @private
     * @param {string} modelName - Model name to match
     * @param {string|RegExp} pattern - Pattern to match against
     * @returns {boolean}
     */
    _matchesPattern(modelName, pattern) {
        if (pattern instanceof RegExp) {
            return pattern.test(modelName);
        }

        if (typeof pattern === 'string') {
            // Exact match
            if (pattern === modelName) {
                return true;
            }

            // Glob-style wildcard support
            if (pattern.includes('*')) {
                const regexPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
                    .replace(/\*/g, '.*'); // Convert * to .*
                const regex = new RegExp(`^${regexPattern}$`, 'i');
                return regex.test(modelName);
            }

            // Case-insensitive prefix match for convenience
            return modelName.toLowerCase().startsWith(pattern.toLowerCase());
        }

        return false;
    }

    /**
     * Send a non-streaming message request
     * @param {Object} request - Anthropic-format request
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Anthropic-format response
     */
    async sendMessage(request, options = {}) {
        const { provider, fallbackProvider } = this.selectProvider(request.model);

        logger.info(`[Router] Routing non-streaming request for ${request.model} to ${provider.name}`);

        try {
            return await provider.sendMessage(request, options);
        } catch (error) {
            // Attempt fallback if enabled and available
            if (this.fallbackEnabled && fallbackProvider) {
                logger.warn(
                    `[Router] Primary provider ${provider.name} failed, attempting fallback to ${fallbackProvider.name}`,
                    { error: error.message }
                );

                try {
                    return await fallbackProvider.sendMessage(request, options);
                } catch (fallbackError) {
                    logger.error(
                        `[Router] Fallback provider ${fallbackProvider.name} also failed`,
                        { error: fallbackError.message }
                    );
                    throw fallbackError;
                }
            }

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
        const { provider, fallbackProvider } = this.selectProvider(request.model);

        logger.info(`[Router] Routing streaming request for ${request.model} to ${provider.name}`);

        try {
            yield* provider.sendMessageStream(request, options);
        } catch (error) {
            // Attempt fallback if enabled and available
            if (this.fallbackEnabled && fallbackProvider) {
                logger.warn(
                    `[Router] Primary provider ${provider.name} failed, attempting fallback to ${fallbackProvider.name}`,
                    { error: error.message }
                );

                try {
                    yield* fallbackProvider.sendMessageStream(request, options);
                } catch (fallbackError) {
                    logger.error(
                        `[Router] Fallback provider ${fallbackProvider.name} also failed`,
                        { error: fallbackError.message }
                    );
                    throw fallbackError;
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * List available models across all providers
     * @returns {Promise<Array>} Array of model objects with provider info
     */
    async listModels() {
        const allModels = [];

        for (const [name, provider] of this.providers.entries()) {
            try {
                const models = await provider.listModels();
                // Tag each model with its provider
                const taggedModels = models.map(model => ({
                    ...model,
                    provider: name
                }));
                allModels.push(...taggedModels);
            } catch (error) {
                logger.error(`[Router] Failed to list models from ${name}:`, error);
            }
        }

        return allModels;
    }

    /**
     * Get health status of all providers
     * @returns {Promise<Object>} Health status by provider
     */
    async getHealth() {
        const health = {};

        for (const [name, provider] of this.providers.entries()) {
            try {
                health[name] = await provider.getHealth();
            } catch (error) {
                health[name] = {
                    provider: name,
                    status: 'error',
                    message: error.message
                };
            }
        }

        return health;
    }

    /**
     * Add a routing rule
     * @param {Object} rule - Routing rule { pattern, provider, fallback }
     */
    addRoutingRule(rule) {
        this.routingRules.push(rule);
        logger.info(`[Router] Added routing rule: ${rule.pattern} -> ${rule.provider}`);
    }

    /**
     * Clear all routing rules
     */
    clearRoutingRules() {
        this.routingRules = [];
        logger.info('[Router] Cleared all routing rules');
    }

    /**
     * Get current routing configuration
     * @returns {Object}
     */
    getConfig() {
        return {
            providers: Array.from(this.providers.keys()),
            routingRules: this.routingRules,
            defaultProvider: this.defaultProvider,
            fallbackEnabled: this.fallbackEnabled
        };
    }
}

/**
 * Create a router instance with default configuration
 * @param {Object} options - Router options
 * @returns {ProviderRouter}
 */
export function createRouter(options = {}) {
    return new ProviderRouter(options);
}

export default ProviderRouter;
