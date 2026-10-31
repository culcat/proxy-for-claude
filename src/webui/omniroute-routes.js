/**
 * Omniroute API Routes
 * REST API for Omniroute provider and routing management
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

// Placeholder: Import these when routing layer (task #2) and config (task #3) are ready
// import { OmnirouteRouter } from '../routing/omniroute-router.js';
// import { loadOmnirouteConfig, saveOmnirouteConfig } from '../config/omniroute-config.js';

/**
 * In-memory placeholder storage until persistence layer is ready
 * This will be replaced by the config module from task #3
 */
let omnirouteConfig = {
    enabled: false,
    serverUrl: null,
    apiKey: null,
    providers: [],
    routes: []
};

/**
 * Placeholder router instance
 * This will be replaced by the actual OmnirouteRouter from task #2
 */
let routerInstance = null;

/**
 * POST /api/omniroute/connect
 * Test connection to Omniroute server and save configuration
 */
router.post('/connect', async (req, res) => {
    try {
        const { serverUrl, apiKey } = req.body;

        if (!serverUrl || typeof serverUrl !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Server URL is required'
            });
        }

        if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'API key is required'
            });
        }

        // TODO: Replace with actual OmnirouteRouter.testConnection() when available
        // const testResult = await OmnirouteRouter.testConnection(serverUrl, apiKey);

        // Placeholder: Simulate connection test
        logger.info(`[Omniroute] Testing connection to ${serverUrl}`);
        const testResult = {
            success: true,
            serverVersion: '1.0.0-placeholder',
            availableProviders: []
        };

        if (testResult.success) {
            // Save configuration
            omnirouteConfig.serverUrl = serverUrl;
            omnirouteConfig.apiKey = apiKey;
            omnirouteConfig.enabled = true;

            // TODO: Call saveOmnirouteConfig() when persistence layer is ready
            logger.success(`[Omniroute] Connected to ${serverUrl}`);

            res.json({
                status: 'ok',
                message: 'Successfully connected to Omniroute server',
                serverVersion: testResult.serverVersion,
                availableProviders: testResult.availableProviders
            });
        } else {
            res.status(503).json({
                status: 'error',
                error: 'Failed to connect to Omniroute server'
            });
        }
    } catch (error) {
        logger.error('[Omniroute] Connection test failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * GET /api/omniroute/status
 * Get Omniroute connection status and health
 */
router.get('/status', async (req, res) => {
    try {
        // TODO: Replace with actual health check when routing layer is ready
        // const health = await routerInstance?.getHealth();

        const health = {
            enabled: omnirouteConfig.enabled,
            connected: omnirouteConfig.serverUrl !== null,
            serverUrl: omnirouteConfig.serverUrl,
            providerCount: omnirouteConfig.providers.length,
            routeCount: omnirouteConfig.routes.length,
            lastSync: null // Will be populated by routing layer
        };

        res.json({
            status: 'ok',
            ...health
        });
    } catch (error) {
        logger.error('[Omniroute] Status check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * GET /api/omniroute/providers
 * List all configured providers
 */
router.get('/providers', async (req, res) => {
    try {
        // TODO: Replace with actual provider listing when routing layer is ready
        // const providers = await routerInstance?.listProviders();

        res.json({
            status: 'ok',
            providers: omnirouteConfig.providers
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to list providers:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * POST /api/omniroute/providers
 * Add a new provider
 */
router.post('/providers', async (req, res) => {
    try {
        const { name, type, endpoint, apiKey, models, enabled = true } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Provider name is required'
            });
        }

        if (!type || typeof type !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Provider type is required'
            });
        }

        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Provider endpoint is required'
            });
        }

        // Check for duplicate name
        if (omnirouteConfig.providers.find(p => p.name === name)) {
            return res.status(409).json({
                status: 'error',
                error: `Provider with name "${name}" already exists`
            });
        }

        // Create provider object
        const provider = {
            id: `provider-${Date.now()}`,
            name,
            type,
            endpoint,
            apiKey,
            models: models || [],
            enabled,
            createdAt: new Date().toISOString()
        };

        // TODO: Replace with actual provider creation when routing layer is ready
        // await routerInstance?.addProvider(provider);

        omnirouteConfig.providers.push(provider);
        logger.info(`[Omniroute] Added provider: ${name} (${type})`);

        res.status(201).json({
            status: 'ok',
            message: `Provider "${name}" added successfully`,
            provider
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to add provider:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * PUT /api/omniroute/providers/:id
 * Update an existing provider
 */
router.put('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Find provider
        const providerIndex = omnirouteConfig.providers.findIndex(p => p.id === id);
        if (providerIndex === -1) {
            return res.status(404).json({
                status: 'error',
                error: `Provider with id "${id}" not found`
            });
        }

        // If renaming, check for duplicate name
        if (updates.name && updates.name !== omnirouteConfig.providers[providerIndex].name) {
            if (omnirouteConfig.providers.find(p => p.name === updates.name)) {
                return res.status(409).json({
                    status: 'error',
                    error: `Provider with name "${updates.name}" already exists`
                });
            }
        }

        // Update provider
        const updatedProvider = {
            ...omnirouteConfig.providers[providerIndex],
            ...updates,
            id, // Preserve ID
            updatedAt: new Date().toISOString()
        };

        // TODO: Replace with actual provider update when routing layer is ready
        // await routerInstance?.updateProvider(id, updates);

        omnirouteConfig.providers[providerIndex] = updatedProvider;
        logger.info(`[Omniroute] Updated provider: ${id}`);

        res.json({
            status: 'ok',
            message: `Provider "${id}" updated successfully`,
            provider: updatedProvider
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to update provider:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * DELETE /api/omniroute/providers/:id
 * Remove a provider
 */
router.delete('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find provider
        const providerIndex = omnirouteConfig.providers.findIndex(p => p.id === id);
        if (providerIndex === -1) {
            return res.status(404).json({
                status: 'error',
                error: `Provider with id "${id}" not found`
            });
        }

        // Check if provider is referenced by any routes
        const referencingRoutes = omnirouteConfig.routes.filter(r =>
            r.primaryProvider === id || r.fallbackProvider === id
        );

        if (referencingRoutes.length > 0) {
            return res.status(409).json({
                status: 'error',
                error: `Cannot delete provider: it is referenced by ${referencingRoutes.length} route(s)`
            });
        }

        // TODO: Replace with actual provider deletion when routing layer is ready
        // await routerInstance?.deleteProvider(id);

        omnirouteConfig.providers.splice(providerIndex, 1);
        logger.info(`[Omniroute] Deleted provider: ${id}`);

        res.json({
            status: 'ok',
            message: `Provider "${id}" deleted successfully`
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to delete provider:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * GET /api/omniroute/routes
 * List all routing rules
 */
router.get('/routes', async (req, res) => {
    try {
        // TODO: Replace with actual route listing when routing layer is ready
        // const routes = await routerInstance?.listRoutes();

        res.json({
            status: 'ok',
            routes: omnirouteConfig.routes
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to list routes:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * POST /api/omniroute/routes
 * Create a new routing rule
 */
router.post('/routes', async (req, res) => {
    try {
        const {
            name,
            modelPattern,
            primaryProvider,
            fallbackProvider,
            priority = 0,
            enabled = true
        } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Route name is required'
            });
        }

        if (!modelPattern || typeof modelPattern !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Model pattern is required'
            });
        }

        if (!primaryProvider || typeof primaryProvider !== 'string') {
            return res.status(400).json({
                status: 'error',
                error: 'Primary provider is required'
            });
        }

        // Validate providers exist
        if (!omnirouteConfig.providers.find(p => p.id === primaryProvider)) {
            return res.status(400).json({
                status: 'error',
                error: `Primary provider "${primaryProvider}" not found`
            });
        }

        if (fallbackProvider && !omnirouteConfig.providers.find(p => p.id === fallbackProvider)) {
            return res.status(400).json({
                status: 'error',
                error: `Fallback provider "${fallbackProvider}" not found`
            });
        }

        // Create route object
        const route = {
            id: `route-${Date.now()}`,
            name,
            modelPattern,
            primaryProvider,
            fallbackProvider,
            priority,
            enabled,
            createdAt: new Date().toISOString()
        };

        // TODO: Replace with actual route creation when routing layer is ready
        // await routerInstance?.addRoute(route);

        omnirouteConfig.routes.push(route);
        omnirouteConfig.routes.sort((a, b) => b.priority - a.priority); // Sort by priority
        logger.info(`[Omniroute] Added route: ${name} (${modelPattern})`);

        res.status(201).json({
            status: 'ok',
            message: `Route "${name}" created successfully`,
            route
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to create route:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * PUT /api/omniroute/routes/:id
 * Update an existing routing rule
 */
router.put('/routes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Find route
        const routeIndex = omnirouteConfig.routes.findIndex(r => r.id === id);
        if (routeIndex === -1) {
            return res.status(404).json({
                status: 'error',
                error: `Route with id "${id}" not found`
            });
        }

        // Validate providers if they're being updated
        if (updates.primaryProvider && !omnirouteConfig.providers.find(p => p.id === updates.primaryProvider)) {
            return res.status(400).json({
                status: 'error',
                error: `Primary provider "${updates.primaryProvider}" not found`
            });
        }

        if (updates.fallbackProvider && !omnirouteConfig.providers.find(p => p.id === updates.fallbackProvider)) {
            return res.status(400).json({
                status: 'error',
                error: `Fallback provider "${updates.fallbackProvider}" not found`
            });
        }

        // Update route
        const updatedRoute = {
            ...omnirouteConfig.routes[routeIndex],
            ...updates,
            id, // Preserve ID
            updatedAt: new Date().toISOString()
        };

        // TODO: Replace with actual route update when routing layer is ready
        // await routerInstance?.updateRoute(id, updates);

        omnirouteConfig.routes[routeIndex] = updatedRoute;
        omnirouteConfig.routes.sort((a, b) => b.priority - a.priority); // Re-sort if priority changed
        logger.info(`[Omniroute] Updated route: ${id}`);

        res.json({
            status: 'ok',
            message: `Route "${id}" updated successfully`,
            route: updatedRoute
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to update route:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * DELETE /api/omniroute/routes/:id
 * Delete a routing rule
 */
router.delete('/routes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find route
        const routeIndex = omnirouteConfig.routes.findIndex(r => r.id === id);
        if (routeIndex === -1) {
            return res.status(404).json({
                status: 'error',
                error: `Route with id "${id}" not found`
            });
        }

        // TODO: Replace with actual route deletion when routing layer is ready
        // await routerInstance?.deleteRoute(id);

        omnirouteConfig.routes.splice(routeIndex, 1);
        logger.info(`[Omniroute] Deleted route: ${id}`);

        res.json({
            status: 'ok',
            message: `Route "${id}" deleted successfully`
        });
    } catch (error) {
        logger.error('[Omniroute] Failed to delete route:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * POST /api/omniroute/sync
 * Force synchronization with Omniroute server
 */
router.post('/sync', async (req, res) => {
    try {
        if (!omnirouteConfig.enabled || !omnirouteConfig.serverUrl) {
            return res.status(400).json({
                status: 'error',
                error: 'Omniroute is not connected'
            });
        }

        // TODO: Replace with actual sync when routing layer is ready
        // const syncResult = await routerInstance?.syncWithServer();

        logger.info('[Omniroute] Syncing with server...');
        const syncResult = {
            success: true,
            providersUpdated: 0,
            routesUpdated: 0,
            timestamp: new Date().toISOString()
        };

        res.json({
            status: 'ok',
            message: 'Sync completed successfully',
            ...syncResult
        });
    } catch (error) {
        logger.error('[Omniroute] Sync failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * Initialize router instance (called from server.js)
 * @param {OmnirouteRouter} router - The routing layer instance
 */
export function initializeOmnirouteRouter(router) {
    routerInstance = router;
    logger.info('[Omniroute] Router instance initialized');
}

export default router;
