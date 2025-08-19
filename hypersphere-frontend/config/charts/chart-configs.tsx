import { ChartConfig } from '../../types';
import { HYPERLIQUID_COLORS } from '../colors';

export const DEFAULT_CHART_CONFIGS: Partial<ChartConfig>[] = [
  {
    title: 'Transaction Activity',
    type: 'line',
    dataSource: 'transactions',
    xAxis: 'time',
    yAxis: 'count',
    yAxis2: 'avg_gas',
    refreshInterval: 30000, // 30 seconds
    styling: {
      colors: [HYPERLIQUID_COLORS.accent.light, HYPERLIQUID_COLORS.status.error],
      strokeWidth: 3,
      showGrid: true,
      showLegend: true,
    },
  },
  {
    title: 'Top Tokens by Transfers',
    type: 'pie',
    dataSource: 'tokens',
    xAxis: 'symbol',
    yAxis: 'transfers',
    refreshInterval: 60000, // 1 minute
    styling: {
      colors: [...HYPERLIQUID_COLORS.chart.gradient],
      showLegend: true,
    },
  },
  {
    title: 'Gas Price Trends',
    type: 'line',
    dataSource: 'gas',
    xAxis: 'time',
    yAxis: 'avg_gas_price',
    yAxis2: 'max_gas_price',
    refreshInterval: 15000, // 15 seconds
    styling: {
      colors: [HYPERLIQUID_COLORS.status.warning, HYPERLIQUID_COLORS.status.error],
      strokeWidth: 2,
      showGrid: true,
    },
  },
  {
    title: 'Transaction Flows',
    type: 'bar',
    dataSource: 'flows',
    xAxis: 'token',
    yAxis: 'count',
    refreshInterval: 120000, // 2 minutes
    styling: {
      colors: [HYPERLIQUID_COLORS.accent.light],
      showGrid: true,
      showLegend: false,
    },
  },
];