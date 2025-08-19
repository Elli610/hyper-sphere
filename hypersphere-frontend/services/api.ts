import { ChartData } from '../types';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://api.hypersphere.cypherlab.org';
  }

  async fetchData(endpoint: string, params?: Record<string, any>): Promise<ChartData[]> {
    const url = new URL(endpoint, this.baseUrl);
    
    // Add custom params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
    }

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('API fetch error:', error);
      // Return mock data for development if API fails
      return this.getMockData(endpoint);
    }
  }

  private getMockData(endpoint: string): ChartData[] {
    // Mock data for development when API is unavailable
    if (endpoint.includes('tx/timeseries')) {
      return [
        { timestamp: '2025-08-19T00:00:00Z', count: 120, avg_gas: 0.5, total_gas: 60 },
        { timestamp: '2025-08-19T01:00:00Z', count: 85, avg_gas: 0.3, total_gas: 25.5 },
        { timestamp: '2025-08-19T02:00:00Z', count: 200, avg_gas: 0.8, total_gas: 160 },
        { timestamp: '2025-08-19T03:00:00Z', count: 350, avg_gas: 1.2, total_gas: 420 },
        { timestamp: '2025-08-19T04:00:00Z', count: 280, avg_gas: 0.9, total_gas: 252 },
        { timestamp: '2025-08-19T05:00:00Z', count: 190, avg_gas: 0.6, total_gas: 114 },
      ];
    }
    
    if (endpoint.includes('tokens/top')) {
      return [
        { symbol: 'USDC', name: 'USD Coin', transfers: 1200, volume: 2500000 },
        { symbol: 'ETH', name: 'Ethereum', transfers: 800, volume: 1800000 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', transfers: 450, volume: 950000 },
        { symbol: 'DAI', name: 'Dai Stablecoin', transfers: 300, volume: 650000 },
        { symbol: 'USDT', name: 'Tether USD', transfers: 250, volume: 420000 },
      ];
    }
    
    if (endpoint.includes('flows/basic')) {
      return [
        { from_address: '0x1234...abcd', to_address: '0x5678...efgh', count: 156, token: 'ETH' },
        { from_address: '0x2345...bcde', to_address: '0x6789...fghi', count: 234, token: 'USDC' },
        { from_address: '0x3456...cdef', to_address: '0x7890...ghij', count: 189, token: 'WBTC' },
        { from_address: '0x4567...defa', to_address: '0x8901...hijk', count: 98, token: 'DAI' },
      ];
    }
    
    if (endpoint.includes('gas/timeseries')) {
      return [
        { timestamp: '2025-08-19T00:00:00Z', avg_gas_price: 0.5, max_gas_price: 0.8, min_gas_price: 0.3 },
        { timestamp: '2025-08-19T01:00:00Z', avg_gas_price: 0.3, max_gas_price: 0.5, min_gas_price: 0.2 },
        { timestamp: '2025-08-19T02:00:00Z', avg_gas_price: 0.8, max_gas_price: 1.2, min_gas_price: 0.6 },
        { timestamp: '2025-08-19T03:00:00Z', avg_gas_price: 1.2, max_gas_price: 1.8, min_gas_price: 0.9 },
        { timestamp: '2025-08-19T04:00:00Z', avg_gas_price: 0.9, max_gas_price: 1.3, min_gas_price: 0.7 },
        { timestamp: '2025-08-19T05:00:00Z', avg_gas_price: 0.6, max_gas_price: 0.9, min_gas_price: 0.4 },
      ];
    }
    
    return [];
  }

  // Specific data fetchers using real HyperEVM endpoints
  async getTransactionData(freq: string = 'h') {
    return this.fetchData('/tx/timeseries', { freq, fmt: 'json' });
  }

  async getTokenData(k: number = 10) {
    return this.fetchData('/tokens/top', { k, fmt: 'json' });
  }

  async getFlowsData(top: number = 30) {
    return this.fetchData('/flows/basic', { top, fmt: 'json' });
  }

  async getGasData(freq: string = 'h') {
    return this.fetchData('/gas/timeseries', { freq, fmt: 'json' });
  }

  async getFlowsAmounts(top: number = 30) {
    return this.fetchData('/flows/amounts', { top, fmt: 'json' });
  }

  async getEventsTypes() {
    return this.fetchData('/events/types', { fmt: 'json' });
  }

  async getHealthStatus() {
    return this.fetchData('/health');
  }

  async getApiInfo() {
    return this.fetchData('/info');
  }
}

export const apiService = new ApiService();