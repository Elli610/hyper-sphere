export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  dataSource: string;
  endpoint: string;
  refreshInterval: number;
  xAxis: string;
  yAxis: string;
  yAxis2?: string;
  filters?: ChartFilter[];
  styling?: ChartStyling;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export interface ChartFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number;
}

export interface ChartStyling {
  colors: string[];
  strokeWidth?: number;
  fillOpacity?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export interface DataSource {
  id: string;
  name: string;
  endpoint: string;
  fields: DataField[];
  description: string;
}

export interface DataField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date';
  format?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  status: 'success' | 'error';
  message?: string;
  timestamp: string;
}

export interface ChartData {
  [key: string]: any;
}