'use client';

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Settings, X, RefreshCw, TrendingUp, BarChart3, Activity, AlertCircle } from 'lucide-react';
import { ChartConfig, ChartData } from '../../types';
import { useChartData } from '../../hooks/useChartData';
import { HYPERLIQUID_COLORS } from '../../config/colors';

interface ChartComponentProps {
  config: ChartConfig;
  onRemove: (id: string) => void;
  onSettings: (id: string) => void;
}

export default function ChartComponent({ config, onRemove, onSettings }: ChartComponentProps) {
  const { data, loading, error, lastUpdated, refetch } = useChartData(config);

  const getChartIcon = () => {
    switch (config.type) {
      case 'line':
        return <TrendingUp className="w-5 h-5" style={{ color: HYPERLIQUID_COLORS.accent.light }} />;
      case 'bar':
        return <BarChart3 className="w-5 h-5" style={{ color: HYPERLIQUID_COLORS.status.success }} />;
      case 'pie':
        return <Activity className="w-5 h-5" style={{ color: HYPERLIQUID_COLORS.status.warning }} />;
      case 'area':
        return <TrendingUp className="w-5 h-5" style={{ color: HYPERLIQUID_COLORS.accent.primary }} />;
      default:
        return <TrendingUp className="w-5 h-5" style={{ color: HYPERLIQUID_COLORS.accent.light }} />;
    }
  };

  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return '';
    
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: HYPERLIQUID_COLORS.accent.light }} />
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8" style={{ color: HYPERLIQUID_COLORS.status.error }} />
          <p className="text-sm" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
            {error}
          </p>
          <button
            onClick={refetch}
            className="px-3 py-1 text-xs rounded-md transition-colors"
            style={{ 
              backgroundColor: HYPERLIQUID_COLORS.accent.primary,
              color: 'white'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center">
          <p style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>No data available</p>
        </div>
      );
    }

    const colors = config.styling?.colors || HYPERLIQUID_COLORS.chart.gradient;

    switch (config.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              {config.styling?.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke={HYPERLIQUID_COLORS.foreground.quaternary} />
              )}
              <XAxis 
                dataKey={config.xAxis} 
                className="text-sm"
                stroke={HYPERLIQUID_COLORS.foreground.tertiary}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-sm"
                stroke={HYPERLIQUID_COLORS.foreground.tertiary}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                  border: `1px solid ${HYPERLIQUID_COLORS.foreground.quaternary}`, 
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.md,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  color: HYPERLIQUID_COLORS.foreground.primary
                }}
              />
              <Line 
                type="monotone" 
                dataKey={config.yAxis} 
                stroke={colors[0]} 
                strokeWidth={config.styling?.strokeWidth || 3}
                dot={false}
                activeDot={{ r: 6, fill: colors[0] }}
              />
              {config.yAxis2 && (
                <Line 
                  type="monotone" 
                  dataKey={config.yAxis2} 
                  stroke={colors[1] || HYPERLIQUID_COLORS.status.error} 
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              {config.styling?.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke={HYPERLIQUID_COLORS.foreground.quaternary} />
              )}
              <XAxis 
                dataKey={config.xAxis} 
                className="text-sm"
                stroke={HYPERLIQUID_COLORS.foreground.tertiary}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-sm"
                stroke={HYPERLIQUID_COLORS.foreground.tertiary}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                  border: `1px solid ${HYPERLIQUID_COLORS.foreground.quaternary}`, 
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.md,
                  color: HYPERLIQUID_COLORS.foreground.primary
                }}
              />
              <Bar 
                dataKey={config.yAxis} 
                fill={colors[0]} 
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              {config.styling?.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke={HYPERLIQUID_COLORS.foreground.quaternary} />
              )}
              <XAxis 
                dataKey={config.xAxis} 
                className="text-sm"
                stroke={HYPERLIQUID_COLORS.foreground.tertiary}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                className="text-sm"
                stroke={HYPERLIQUID_COLORS.foreground.tertiary}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                  border: `1px solid ${HYPERLIQUID_COLORS.foreground.quaternary}`, 
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.md,
                  color: HYPERLIQUID_COLORS.foreground.primary
                }}
              />
              <Area 
                type="monotone" 
                dataKey={config.yAxis} 
                stroke={colors[0]} 
                fill={colors[0]}
                fillOpacity={config.styling?.fillOpacity || 0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey={config.yAxis}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                  border: `1px solid ${HYPERLIQUID_COLORS.foreground.quaternary}`, 
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.md,
                  color: HYPERLIQUID_COLORS.foreground.primary
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <div className="h-64 flex items-center justify-center">
            <p style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
              Unsupported chart type: {config.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div 
      className="rounded-2xl p-6 relative group border transition-all duration-300" 
      style={{ 
        backgroundColor: HYPERLIQUID_COLORS.background.secondary, 
        borderColor: HYPERLIQUID_COLORS.foreground.quaternary,
        borderRadius: HYPERLIQUID_COLORS.borderRadius.mdlg
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.tertiary}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={refetch}
          className="p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: HYPERLIQUID_COLORS.background.tertiary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.foreground.quaternary}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.background.tertiary}
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }} />
        </button>
        <button
          onClick={() => onSettings(config.id)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: HYPERLIQUID_COLORS.background.tertiary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.foreground.quaternary}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.background.tertiary}
          title="Chart settings"
        >
          <Settings className="w-4 h-4" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }} />
        </button>
        <button
          onClick={() => onRemove(config.id)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: HYPERLIQUID_COLORS.status.error }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(7, 80%, 55%)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.status.error}
          title="Remove chart"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {getChartIcon()}
        <h3 className="text-xl font-semibold" style={{ color: HYPERLIQUID_COLORS.foreground.primary }}>
          {config.title}
        </h3>
        <div className="ml-auto flex items-center gap-2 text-sm" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
          <div className={`w-2 h-2 rounded-full ${loading ? 'animate-pulse' : ''}`} 
               style={{ backgroundColor: loading ? HYPERLIQUID_COLORS.status.warning : HYPERLIQUID_COLORS.status.success }}></div>
          <span>{loading ? 'Loading...' : 'Live'}</span>
          {lastUpdated && (
            <span className="text-xs">
              {formatTimestamp(lastUpdated)}
            </span>
          )}
        </div>
      </div>
      
      {/* Chart */}
      {renderChart()}
    </div>
  );
}