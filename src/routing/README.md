# Provider Abstraction Layer

This module implements a provider abstraction layer that allows the proxy to work with multiple backends (Google CloudCode, Omniroute, etc.) through a unified interface.

## Architecture

```
┌─────────────────┐
│   Server.js     │
│  (API Handler)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ProviderRouter │ ◄─── Routes requests based on model/config
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Google  │ │  Omniroute   │
│Provider │ │   Provider   │
└─────────┘ └──────────────┘
```

## Components

### 1. BaseProvider (`provider-interface.js`)
Abstract base class defining the provider contract:
- `sendMessage(request, options)` - Non-streaming requests
- `sendMessageStream(request, options)` - Streaming requests
- `listModels(options)` - List available models
- `getHealth()` - Health check
- `supportsModel(modelName)` - Model support check

### 2. GoogleProvider (`google-provider.js`)
Wraps the existing Google CloudCode client:
- Integrates with AccountManager for multi-account support
- Supports Gemini and Claude models via CloudCode
- Handles rate limiting and account failover
- Optional fallback mode

### 3. OmnirouteProvider (`omniroute-provider.js`)
Placeholder for Omniroute integration:
- Implements provider interface
- Graceful degradation when not configured
- Ready for future implementation

### 4. ProviderFactory (`provider-factory.js`)
Factory pattern for provider instantiation:
- Registry of provider types
- Instance caching
- Support for custom provider registration

### 5. ProviderRouter (`router.js`)
Main routing logic:
- Model pattern matching (glob/regex support)
- Provider selection based on rules
- Fallback chain support
- Health monitoring across providers

## Usage

### Basic Setup

```javascript
import { createRouter } from './routing/index.js';
import AccountManager from './account-manager/index.js';

// Initialize account manager
const accountManager = new AccountManager();
await accountManager.initialize();

// Create router
const router = createRouter({
    accountManager,
    fallbackEnabled: true,
    defaultProvider: 'google'
});

// Send request
const response = await router.sendMessage({
    model: 'gemini-2.0-flash-exp',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 1024
});
```

### Streaming

```javascript
for await (const event of router.sendMessageStream(request)) {
    console.log(event);
}
```

### Adding Routing Rules

```javascript
// Route all Gemini models to Google provider
router.addRoutingRule({
    pattern: 'gemini-*',
    provider: 'google',
    fallback: null
});

// Route Claude models to Omniroute with Google fallback
router.addRoutingRule({
    pattern: 'claude-*',
    provider: 'omniroute',
    fallback: 'google'
});

// Regex pattern support
router.addRoutingRule({
    pattern: /^gpt-/i,
    provider: 'omniroute',
    fallback: null
});
```

### Health Monitoring

```javascript
const health = await router.getHealth();
console.log(health);
// {
//   google: { status: 'healthy', accounts: { total: 3, available: 2 } },
//   omniroute: { status: 'unavailable', message: '...' }
// }
```

## Configuration

### Via Config File (`~/.config/antigravity-proxy/config.json`)

```json
{
    "routing": {
        "defaultProvider": "google",
        "fallbackEnabled": true,
        "providers": [
            {
                "type": "google",
                "name": "google",
                "config": {
                    "fallbackEnabled": false
                }
            },
            {
                "type": "omniroute",
                "name": "omniroute",
                "config": {
                    "apiKey": "your-key-here",
                    "baseUrl": "https://api.omniroute.ai"
                }
            }
        ],
        "routingRules": [
            {
                "pattern": "gemini-*",
                "provider": "google"
            },
            {
                "pattern": "claude-*",
                "provider": "omniroute",
                "fallback": "google"
            }
        ]
    }
}
```

### Environment Variables

- `OMNIROUTE_API_KEY` - Omniroute API key
- `OMNIROUTE_BASE_URL` - Omniroute API base URL (optional)

## Extending with Custom Providers

```javascript
import { BaseProvider } from './routing/provider-interface.js';
import { ProviderFactory } from './routing/provider-factory.js';

class MyCustomProvider extends BaseProvider {
    constructor(config) {
        super('mycustom', config);
    }

    async sendMessage(request, options) {
        // Implementation
    }

    async *sendMessageStream(request, options) {
        // Implementation
    }

    async listModels(options) {
        // Implementation
    }

    supportsModel(modelName) {
        // Implementation
    }
}

// Register custom provider
ProviderFactory.registerProvider('mycustom', MyCustomProvider);

// Use in router
router.addRoutingRule({
    pattern: 'mycustom-*',
    provider: 'mycustom'
});
```

## Error Handling

Providers throw standard errors that propagate through the router:
- Account/authentication errors
- Rate limit errors
- Network errors
- Validation errors

The router handles fallback logic when configured:
1. Primary provider fails
2. If `fallbackEnabled` and fallback provider defined
3. Attempt fallback provider
4. If fallback also fails, throw error

## Pattern Matching

The router supports multiple pattern types:

### Exact Match
```javascript
{ pattern: 'gemini-2.0-flash-exp', provider: 'google' }
```

### Glob-style Wildcards
```javascript
{ pattern: 'gemini-*', provider: 'google' }
{ pattern: 'claude-3-*', provider: 'google' }
```

### Regular Expressions
```javascript
{ pattern: /^(gemini|claude)-/, provider: 'google' }
```

### Prefix Match (case-insensitive)
```javascript
{ pattern: 'gemini', provider: 'google' } // Matches gemini-*
```

## Integration Points

### Server Integration
Update `server.js` to use the router instead of direct CloudCode calls:

```javascript
import { createRouter } from './routing/index.js';

// Initialize router
const router = createRouter({
    accountManager,
    fallbackEnabled: globalConfig.fallbackEnabled
});

// In message endpoint
const response = await router.sendMessage(request);
```

### Backward Compatibility
The Google provider wraps existing CloudCode functions, maintaining full compatibility with:
- Account selection strategies
- Rate limiting logic
- Error handling
- Fallback mechanisms

## Future Enhancements

1. **Load Balancing**: Distribute load across multiple providers
2. **Circuit Breaker**: Temporarily disable failing providers
3. **Metrics**: Track provider performance and usage
4. **Cost Optimization**: Route based on cost per token
5. **Smart Routing**: ML-based provider selection
6. **Provider Pools**: Multiple instances of same provider type

## Testing

```bash
# Run provider abstraction tests
npm test -- routing

# Test specific provider
npm test -- routing/google-provider

# Test router logic
npm test -- routing/router
```
