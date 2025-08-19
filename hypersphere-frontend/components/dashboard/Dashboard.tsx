'use client';

import React, { useState } from 'react';
import { Plus, Globe, Activity, Settings } from 'lucide-react';
import { useChartConfig } from '../../hooks/useChartConfig';
import ChartComponent from './ChartComponent';
import AddChartModal from './AddChartModal';
import { HYPERLIQUID_COLORS } from '../../config/colors';

export default function Dashboard() {
  const { charts, loading, addChart, removeChart, updateChart, dataSource } = useChartConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openSettings = (id: string) => {
    console.log('Chart settings:', id);
  };

  const handleAddChart = (config: any) => {
    addChart(config);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: HYPERLIQUID_COLORS.background.primary }}>
        <div className="text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: HYPERLIQUID_COLORS.accent.light }} />
          <p style={{ color: HYPERLIQUID_COLORS.foreground.secondary }}>Loading HyperSphere...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: HYPERLIQUID_COLORS.background.primary }}>
      {/* Header */}
      <div 
        className="border-b" 
        style={{ 
          borderColor: HYPERLIQUID_COLORS.foreground.quaternary, 
          backgroundColor: HYPERLIQUID_COLORS.background.secondary, 
          backdropFilter: 'blur(8px)' 
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center" 
                style={{ 
                  background: `linear-gradient(135deg, ${HYPERLIQUID_COLORS.accent.light}, ${HYPERLIQUID_COLORS.accent.primary})`,
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.md
                }}
              >
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: HYPERLIQUID_COLORS.foreground.primary }}>
                  HyperSphere
                </h1>
                <p className="text-sm" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
                  Real-time HyperEVM ecosystem analytics
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live Status Indicator */}
              <div 
                className="flex items-center gap-2 px-3 py-1.5 border rounded-full"
                style={{ 
                  backgroundColor: 'hsl(147, 43%, 10%)', 
                  borderColor: HYPERLIQUID_COLORS.status.success,
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.lg
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full animate-pulse" 
                  style={{ backgroundColor: HYPERLIQUID_COLORS.status.success }}
                />
                <span className="text-sm font-medium" style={{ color: HYPERLIQUID_COLORS.status.success }}>
                  Live
                </span>
              </div>
              
              {/* Chart Count */}
              <div className="text-sm" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
                {charts.length} {charts.length === 1 ? 'Chart' : 'Charts'}
              </div>
              
              {/* Add Chart Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg"
                style={{ 
                  backgroundColor: HYPERLIQUID_COLORS.accent.primary, 
                  color: 'white',
                  borderRadius: HYPERLIQUID_COLORS.borderRadius.md
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.accent.dark}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.accent.primary}
              >
                <Plus className="w-4 h-4" />
                Add Chart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {charts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <Activity className="w-16 h-16 mx-auto mb-4" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
              No charts configured
            </h3>
            <p className="mb-6" style={{ color: HYPERLIQUID_COLORS.foreground.quaternary }}>
              Start by adding your first chart to visualize your HyperEVM data
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-lg transition-colors font-medium"
              style={{ 
                backgroundColor: HYPERLIQUID_COLORS.accent.primary, 
                color: 'white',
                borderRadius: HYPERLIQUID_COLORS.borderRadius.md
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.accent.dark}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = HYPERLIQUID_COLORS.accent.primary}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Your First Chart
            </button>
          </div>
        ) : (
          /* Charts Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.map((chart) => (
              <ChartComponent
                key={chart.id}
                config={chart}
                onRemove={removeChart}
                onSettings={openSettings}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div 
        className="border-t mt-12 py-6"
        style={{ 
          borderColor: HYPERLIQUID_COLORS.foreground.quaternary,
          backgroundColor: HYPERLIQUID_COLORS.background.secondary
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between text-sm">
            <div style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
              HyperSphere - Built for the HyperEVM ecosystem
            </div>
            <div className="flex items-center gap-4">
              <span style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}>
                Data sources: {dataSource.length}
              </span>
              <button
                onClick={() => console.log('Settings clicked')}
                className="flex items-center gap-1 px-2 py-1 rounded transition-colors"
                style={{ color: HYPERLIQUID_COLORS.foreground.tertiary }}
                onMouseEnter={(e) => e.currentTarget.style.color = HYPERLIQUID_COLORS.foreground.secondary}
                onMouseLeave={(e) => e.currentTarget.style.color = HYPERLIQUID_COLORS.foreground.tertiary}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Chart Modal */}
      {isModalOpen && (
        <AddChartModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddChart}
          dataSources={dataSource}
        />
      )}
    </div>
  );
}