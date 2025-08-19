import { useState, useEffect, useCallback } from 'react';
import { ChartConfig, ChartData } from '../types';
import { apiService } from '../services/api';

export function useChartData(config: ChartConfig) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!config.endpoint || !mounted) return;

    try {
      setLoading(true);
      setError(null);
      
      let newData: ChartData[] = [];
      
      // Route to appropriate API call based on data source
      switch (config.dataSource) {
        case 'transactions':
          newData = await apiService.getTransactionData('h');
          break;
        case 'tokens':
          newData = await apiService.getTokenData(10);
          break;
        case 'flows':
          newData = await apiService.getFlowsData(30);
          break;
        case 'gas':
          newData = await apiService.getGasData('h');
          break;
        case 'flows_amounts':
          newData = await apiService.getFlowsAmounts(30);
          break;
        case 'events':
          newData = await apiService.getEventsTypes();
          break;
        default:
          newData = await apiService.fetchData(config.endpoint);
      }

      // Transform data for chart compatibility
      newData = transformDataForChart(newData, config);

      // Apply filters if any
      if (config.filters && config.filters.length > 0) {
        newData = applyFilters(newData, config.filters);
      }

      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, config.dataSource, config.filters, mounted]);

  const transformDataForChart = (data: ChartData[], config: ChartConfig): ChartData[] => {
    return data.map(item => {
      const transformed = { ...item };
      
      // Transform timestamp to readable format for charts
      if (item.timestamp && typeof item.timestamp === 'string') {
        const date = new Date(item.timestamp);
        transformed.time = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      }

      // Ensure numeric fields are numbers
      Object.keys(transformed).forEach(key => {
        if (typeof transformed[key] === 'string' && !isNaN(Number(transformed[key]))) {
          transformed[key] = Number(transformed[key]);
        }
      });

      // Add color for pie charts
      if (config.type === 'pie' && !transformed.color) {
        const colors = [
          'hsl(172, 47%, 51%)',
          'hsl(172, 47%, 36%)',
          'hsl(172, 47%, 61%)',
          'hsl(147, 43%, 52%)',
          'hsl(36, 100%, 65%)',
          'hsl(7, 80%, 62%)',
        ];
        const index = data.indexOf(item);
        transformed.color = colors[index % colors.length];
      }

      return transformed;
    });
  };

  const applyFilters = (data: ChartData[], filters: ChartConfig['filters']) => {
    if (!filters) return data;

    return data.filter(item => {
      return filters.every(filter => {
        const value = item[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return value === filterValue;
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'greaterThan':
            return Number(value) > Number(filterValue);
          case 'lessThan':
            return Number(value) < Number(filterValue);
          default:
            return true;
        }
      });
    });
  };

  // Auto-refresh based on refresh interval
  useEffect(() => {
    if (!mounted) return;

    // Initial fetch
    fetchData();

    // Set up interval for auto-refresh
    const interval = setInterval(fetchData, config.refreshInterval || 30000);

    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval, mounted]);

  const refetch = () => {
    if (mounted) {
      fetchData();
    }
  };

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return {
      data: [],
      loading: true,
      error: null,
      lastUpdated: null,
      refetch: () => {},
    };
  }

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}