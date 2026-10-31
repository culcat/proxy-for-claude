/**
 * Provider Factory
 *
 * Factory pattern for instantiating and managing provider instances.
 * Handles provider registration, creation, and lifecycle management.
 */

import { GoogleProvider } from './google-provider.js';
import { OmnirouteProvider } from './omniroute-provider.js';
import { logger } from '../utils/logger.js';

/**
 * Registry of available provider types
 */
const PROVIDER_TYPES = {
    google: GoogleProvider,
    omniroute: OmnirouteProvider
};

/**
 * Provider Factory
 */
export class ProviderFactory {
    /**
     * Create a new provider factory
     */
    constructor() {
        this.instances = new Map(); // Cache provider instances by name
    }

    /**
     * Create a provider instance
     * @param {string} type - Provider type ('google', 'omniroute')
     * @param {Object} config - Provider-specific configuration
     * @returns {BaseProvider} Provider instance
     * @throws {Error} If provider type is unknown
     */
    create(type, config = {}) {
        const ProviderClass = PROVIDER_TYPES[type.toLowerCase()];

        if (!ProviderClass) {
            const available = Object.keys(PROVIDER_TYPES).join(', ');
            throw new Error(
                `Unknown provider type: ${type}. Available providers: ${available}`
            );
        }

        logger.info(`[ProviderFactory] Creating ${type} provider`);

        try {
            const provider = new ProviderClass(config);
            return provider;
        } catch (error) {
            logger.error(`[ProviderFactory] Failed to create ${type} provider:`, error);
            throw error;
        }
    }

    /**
     * Get or create a cached provider instance
     * @param {string} type - Provider type
     * @param {Object} config - Provider configuration
     * @param {string} [instanceKey] - Optional key for caching (defaults to type)
     * @returns {BaseProvider}
     */
    getOrCreate(type, config = {}, instanceKey = null) {
        const key = instanceKey || type;

        if (this.instances.has(key)) {
            logger.debug(`[ProviderFactory] Reusing cached ${type} provider instance: ${key}`);
            return this.instances.get(key);
        }

        const provider = this.create(type, config);
        this.instances.set(key, provider);

        return provider;
    }

    /**
     * Check if a provider type is supported
     * @param {string} type - Provider type
     * @returns {boolean}
     */
    isSupported(type) {
        return type.toLowerCase() in PROVIDER_TYPES;
    }

    /**
     * Get list of supported provider types
     * @returns {string[]}
     */
    getSupportedTypes() {
        return Object.keys(PROVIDER_TYPES);
    }

    /**
     * Clear cached provider instance
     * @param {string} key - Instance key
     * @returns {boolean} True if instance was removed
     */
    clearInstance(key) {
        return this.instances.delete(key);
    }

    /**
     * Clear all cached instances
     */
    clearAll() {
        this.instances.clear();
        logger.info('[ProviderFactory] Cleared all cached provider instances');
    }

    /**
     * Register a custom provider type
     * @param {string} name - Provider type name
     * @param {Class} ProviderClass - Provider class (must extend BaseProvider)
     */
    static registerProvider(name, ProviderClass) {
        if (PROVIDER_TYPES[name.toLowerCase()]) {
            logger.warn(`[ProviderFactory] Overwriting existing provider type: ${name}`);
        }

        PROVIDER_TYPES[name.toLowerCase()] = ProviderClass;
        logger.info(`[ProviderFactory] Registered custom provider: ${name}`);
    }
}

/**
 * Create a singleton factory instance
 */
const factory = new ProviderFactory();

/**
 * Convenience function to create a provider
 * @param {string} type - Provider type
 * @param {Object} config - Provider configuration
 * @returns {BaseProvider}
 */
export function createProvider(type, config = {}) {
    return factory.create(type, config);
}

/**
 * Convenience function to get or create a cached provider
 * @param {string} type - Provider type
 * @param {Object} config - Provider configuration
 * @param {string} [instanceKey] - Optional cache key
 * @returns {BaseProvider}
 */
export function getOrCreateProvider(type, config = {}, instanceKey = null) {
    return factory.getOrCreate(type, config, instanceKey);
}

export default factory;
