/**
 * Routing Module
 *
 * Provider abstraction layer for multi-backend support.
 * Exports the router, factory, and provider implementations.
 */

export { BaseProvider } from './provider-interface.js';
export { GoogleProvider } from './google-provider.js';
export { OmnirouteProvider } from './omniroute-provider.js';
export { ProviderRouter, createRouter } from './router.js';
export { ProviderFactory, createProvider, getOrCreateProvider } from './provider-factory.js';
export { default as factory } from './provider-factory.js';

// Default export: convenience object with main exports
export default {
    BaseProvider: BaseProvider,
    GoogleProvider: GoogleProvider,
    OmnirouteProvider: OmnirouteProvider,
    ProviderRouter: ProviderRouter,
    createRouter: createRouter,
    createProvider: createProvider,
    getOrCreateProvider: getOrCreateProvider
};
