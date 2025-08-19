export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  endpoints: {
    transactions: '/api/v1/transactions',
    tokens: '/api/v1/tokens',
    bridge: '/api/v1/bridge',
    dex: '/api/v1/dex',
    gas: '/api/v1/gas',
    blocks: '/api/v1/blocks',
    events: '/api/v1/events',
  },
  defaultParams: {
    limit: 100,
    timeframe: '24h',
    format: 'json',
  },
  refreshIntervals: {
    fast: 15000,    // 15 seconds
    medium: 30000,  // 30 seconds
    slow: 60000,    // 1 minute
    verySlow: 300000, // 5 minutes
  },
} as const;