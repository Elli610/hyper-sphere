'use client';

import React, { useState } from 'react';
import { TrendingUp, BarChart3, Activity, X } from 'lucide-react';
import { ChartConfig, ChartType, DataSource } from '../../types';
import { HYPERLIQUID_COLORS } from '../../config/colors';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: Omit<ChartConfig, 'id'>) => void;
  dataSources: DataSource[];
}

export default function AddChartModal({ isOpen, onClose, onAdd, dataSources }: AddChartModalProps) {
  const [selectedType, setSelectedType] = useState<ChartType>('line');
  const [title, setTitle] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [selectedXAxis, setSelectedXAxis] = useState('');
  const [selectedYAxis, setSelectedYAxis] = useState('');
  const [selectedYAxis2, setSelectedYAxis2] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const chartTypes = [
    { id: 'line' as ChartType, name: 'Line', icon: TrendingUp, desc: 'Time series data' },
    { id: 'bar' as ChartType, name: 'Bar', icon: BarChart3, desc: 'Compare values' },
    { id: 'pie' as ChartType, name: 'Pie', icon: Activity, desc: 'Show distribution' },
    { id: 'area' as ChartType, name: 'Area', icon: TrendingUp, desc: 'Filled line chart' },
  ];

  const refreshOptions = [
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 120000, label: '2 minutes' },
    { value: 300000, label: '5 minutes' },
  ];

  const selectedDataSourceObj = dataSources.find(ds => ds.id === selectedDataSource);
  const availableFields = selectedDataSourceObj?.fields || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedDataSource || !selectedXAxis || !selectedYAxis) {
      return;
    }

    const config: Omit<ChartConfig, 'id'> = {
      title: title.trim(),
      type: selectedType,
      dataSource: selectedDataSource,
      endpoint: selectedDataSourceObj?.endpoint || `/api/${selectedDataSource}`,
      refreshInterval,
      xAxis: selectedXAxis,
      yAxis: selectedYAxis,
      yAxis2: selectedYAxis2 || undefined,
      filters: [],
      styling: {
        colors: HYPERLIQUID_COLORS.chart.gradient.slice(),
        strokeWidth: 3,
        showGrid: true,
        showLegend: selectedType === 'pie',
      },
    };

    onAdd(config);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setSelectedType('line');
    setSelectedDataSource('');
    setSelectedXAxis('');
    setSelectedYAxis('');
    setSelectedYAxis2('');
    setRefreshInterval(30000);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div 
        className="rounded-2xl p-6 w-full max-w-2xl border max-h-[90vh] overflow-y-auto" 
        style={{ 
          backgroundColor: HYPERLIQUID_COLORS.background.secondary, 
          borderColor: HYPERLIQUID_COLORS.foreground.quaternary,
          borderRadius: HYPERLIQUID_COLORS.borderRadius.mdlg
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: HYPERLIQUID_COLORS.foreground.primary }}>
            Add New Chart
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: HYPERLIQUID_COLORS.background.tertiary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.foreground.quaternary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.background.tertiary}
          >
            <X className="w-5 h-5" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chart Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
              Chart Type
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {chartTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className="p-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: isSelected ? HYPERLIQUID_COLORS.accent.light : HYPERLIQUID_COLORS.foreground.quaternary,
                      backgroundColor: isSelected ? 'hsl(172, 47%, 10%)' : 'transparent',
                      borderRadius: HYPERLIQUID_COLORS.borderRadius.md
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.tertiary;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary;
                    }}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-1" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }} />
                    <div className="text-xs font-medium" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
                      {type.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
                      {type.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Title */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
              Chart Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Transaction Activity"
              className="w-full p-3 border rounded-lg focus:outline-none transition-colors"
              style={{ 
                backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
                color: HYPERLIQUID_COLORS.foreground.primary,
                borderRadius: HYPERLIQUID_COLORS.borderRadius.md
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.accent.light}
              onBlur={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
              required
            />
          </div>

          {/* Data Source Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
              Data Source
            </label>
            <select
              value={selectedDataSource}
              onChange={(e) => {
                setSelectedDataSource(e.target.value);
                setSelectedXAxis('');
                setSelectedYAxis('');
                setSelectedYAxis2('');
              }}
              className="w-full p-3 border rounded-lg focus:outline-none transition-colors"
              style={{ 
                backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
                color: HYPERLIQUID_COLORS.foreground.primary,
                borderRadius: HYPERLIQUID_COLORS.borderRadius.md
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.accent.light}
              onBlur={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
              required
            >
              <option value="">Select a data source</option>
              {dataSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            {selectedDataSourceObj && (
              <p className="text-xs mt-1" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
                {selectedDataSourceObj.description}
              </p>
            )}
          </div>

          {/* Field Selection */}
          {selectedDataSource && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
                  X-Axis Field
                </label>
                <select
                  value={selectedXAxis}
                  onChange={(e) => setSelectedXAxis(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none transition-colors"
                  style={{ 
                    backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                    borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
                    color: HYPERLIQUID_COLORS.foreground.primary,
                    borderRadius: HYPERLIQUID_COLORS.borderRadius.md
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.accent.light}
                  onBlur={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
                  required
                >
                  <option value="">Select X-axis</option>
                  {availableFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
                  Y-Axis Field
                </label>
                <select
                  value={selectedYAxis}
                  onChange={(e) => setSelectedYAxis(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none transition-colors"
                  style={{ 
                    backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                    borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
                    color: HYPERLIQUID_COLORS.foreground.primary,
                    borderRadius: HYPERLIQUID_COLORS.borderRadius.md
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.accent.light}
                  onBlur={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
                  required
                >
                  <option value="">Select Y-axis</option>
                  {availableFields.filter(f => f.type === 'number').map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedType === 'line' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
                    Second Y-Axis (Optional)
                  </label>
                  <select
                    value={selectedYAxis2}
                    onChange={(e) => setSelectedYAxis2(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none transition-colors"
                    style={{ 
                      backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                      borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
                      color: HYPERLIQUID_COLORS.foreground.primary,
                      borderRadius: HYPERLIQUID_COLORS.borderRadius.md
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.accent.light}
                    onBlur={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
                  >
                    <option value="">None</option>
                    {availableFields.filter(f => f.type === 'number' && f.key !== selectedYAxis).map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>
              Refresh Interval
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-full p-3 border rounded-lg focus:outline-none transition-colors"
              style={{ 
                backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
                color: HYPERLIQUID_COLORS.foreground.primary,
                borderRadius: HYPERLIQUID_COLORS.borderRadius.md
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.accent.light}
              onBlur={(e) => e.currentTarget.style.borderColor = HYPERLIQUID_COLORS.foreground.quaternary}
            >
              {refreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-lg transition-colors"
              style={{ 
                backgroundColor: HYPERLIQUID_COLORS.background.tertiary, 
                color: HYPERLIQUID_COLORS.foreground.secondary,
                borderRadius: HYPERLIQUID_COLORS.borderRadius.md
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.foreground.quaternary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.background.tertiary}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-lg transition-colors font-medium"
              style={{ 
                backgroundColor: HYPERLIQUID_COLORS.accent.primary, 
                color: 'white',
                borderRadius: HYPERLIQUID_COLORS.borderRadius.md
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.accent.dark}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.accent.primary}
              disabled={!title.trim() || !selectedDataSource || !selectedXAxis || !selectedYAxis}
            >
              Add Chart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}