import { useState, useEffect } from 'react';
import { ChartConfig } from '../types';
import { DEFAULT_CHART_CONFIGS } from '../config/charts/chart-configs';
import { DATA_SOURCES } from '../config/charts/data-sources';

export function useChartConfig() {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    loadCharts();
  }, [mounted]);

  const loadCharts = () => {
    try {
      // Only access localStorage on client side
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const savedCharts = localStorage.getItem('hypersphere-charts');
      if (savedCharts) {
        const parsedCharts = JSON.parse(savedCharts);
        setCharts(parsedCharts);
      } else {
        // Initialize with default configs
        const defaultCharts = DEFAULT_CHART_CONFIGS.map((config, index) => {
          const dataSource = DATA_SOURCES.find(ds => ds.id === config.dataSource);
          return {
            id: `default-${index}`,
            endpoint: dataSource?.endpoint || `/api/${config.dataSource}`,
            refreshInterval: 30000,
            filters: [],
            ...config,
          } as ChartConfig;
        });
        setCharts(defaultCharts);
        saveChartsToStorage(defaultCharts);
      }
    } catch (error) {
      console.error('Error loading charts:', error);
      setCharts([]);
    } finally {
      setLoading(false);
    }
  };

  const saveChartsToStorage = (newCharts: ChartConfig[]) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hypersphere-charts', JSON.stringify(newCharts));
      }
    } catch (error) {
      console.error('Error saving charts to localStorage:', error);
    }
  };

  const saveCharts = (newCharts: ChartConfig[]) => {
    setCharts(newCharts);
    saveChartsToStorage(newCharts);
  };

  const addChart = (config: Omit<ChartConfig, 'id'>) => {
    const newChart: ChartConfig = {
      ...config,
      id: `chart-${Date.now()}`,
    };
    const updatedCharts = [...charts, newChart];
    saveCharts(updatedCharts);
  };

  const removeChart = (id: string) => {
    const updatedCharts = charts.filter(chart => chart.id !== id);
    saveCharts(updatedCharts);
  };

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    const updatedCharts = charts.map(chart =>
      chart.id === id ? { ...chart, ...updates } : chart
    );
    saveCharts(updatedCharts);
  };

  const resetToDefaults = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hypersphere-charts');
      loadCharts();
    }
  };

  return {
    charts: mounted ? charts : [],
    loading: !mounted || loading,
    addChart,
    removeChart,
    updateChart,
    resetToDefaults,
    dataSource: DATA_SOURCES,
  };
}