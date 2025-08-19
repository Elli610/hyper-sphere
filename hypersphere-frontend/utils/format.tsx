// Utility functions for data formatting

export const formatNumber = (value: number, decimals: number = 2): string => {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(decimals) + 'B';
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M';
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K';
  }
  return value.toFixed(decimals);
};

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatTime = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDate = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

export const formatGas = (gasValue: number): string => {
  if (gasValue < 1) {
    return `${(gasValue * 1000).toFixed(0)}M`;
  }
  return `${gasValue.toFixed(2)}G`;
};

export const formatVolume = (volume: number): string => {
  if (volume >= 1e12) {
    return `$${(volume / 1e12).toFixed(2)}T`;
  }
  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(2)}B`;
  }
  if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(2)}M`;
  }
  if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
};

export const getRelativeTime = (timestamp: string | number | Date): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days}d ago`;
};

export const generateChartColors = (count: number): string[] => {
  const baseColors = [
    'hsl(172, 47%, 51%)',
    'hsl(172, 47%, 36%)',
    'hsl(172, 47%, 61%)',
    'hsl(147, 43%, 52%)',
    'hsl(36, 100%, 65%)',
    'hsl(7, 80%, 62%)',
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (172 + (i * 60)) % 360;
    colors.push(`hsl(${hue}, 47%, 51%)`);
  }

  return colors;
};