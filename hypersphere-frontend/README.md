# HyperSphere Dashboard

## 🚀 Features

- **Real-time Data Visualization** - Live charts that auto-refresh
- **Dynamic Chart Creation** - Add and configure charts on the fly
- **Customizable Settings** - Modify chart titles, refresh intervals, and styling
- **Responsive Design** - Works on desktop, tablet, and mobile
- **HyperEVM Integration** - Direct connection to HyperEVM API endpoints
- **Modern UI** - Hyperliquid-inspired design with smooth animations

## 📊 Available Chart Types

- **Line Charts** - Time series data (transactions, gas prices)
- **Bar Charts** - Comparative data (token flows, volumes)
- **Pie Charts** - Distribution data (token breakdowns)
- **Area Charts** - Filled time series visualization

## 🏗️ Project Structure

```
/
├── app/
│   ├── globals.css              # Global styles with Hyperliquid theme
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main dashboard page
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx        # Main dashboard component
│       ├── ChartComponent.tsx   # Individual chart wrapper
│       └── AddChartModal.tsx    # Modal for adding charts
├── config/
│   ├── charts/
│   │   ├── chart-configs.ts     # Default chart configurations
│   │   └── data-sources.ts      # Available data sources
│   ├── api-endpoints.ts         # API configuration
│   └── colors.ts                # Hyperliquid color theme
├── hooks/
│   ├── useChartConfig.ts        # Chart configuration management
│   └── useChartData.ts          # Data fetching and caching
├── services/
│   └── api.ts                   # API service layer
├── types/
│   └── index.ts                 # TypeScript type definitions
└── utils/
    └── format.ts                # Data formatting utilities
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ 
- Yarn package manager

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd hypersphere-dashboard

# Install dependencies
yarn install
```

### 2. Configuration Files

Ensure these configuration files exist:

**postcss.config.js**
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 3. Run Development Server

```bash
# Start development server
yarn dev

# Or with turbopack (faster)
yarn dev:turbo
```

Visit `http://localhost:3000` to see your dashboard.

## 🔧 API Integration

### Current API Endpoints

The dashboard connects to the HyperSphere HyperEVM API at `https://api.hypersphere.cypherlab.org`:

- **`/tx/timeseries`** - Transaction activity over time
- **`/gas/timeseries`** - Gas price trends
- **`/tokens/top`** - Most active tokens
- **`/flows/basic`** - Transaction flows between addresses
- **`/flows/amounts`** - Flow data with amounts
- **`/events/types`** - Available event types

### Configuring API Endpoints

To modify API endpoints, edit `config/api-endpoints.ts`:

```typescript
export const API_CONFIG = {
  baseUrl: 'https://your-api-url.com', // Change this
  endpoints: {
    transactions: '/tx/timeseries',
    tokens: '/tokens/top',
    // Add new endpoints here
  },
}
```

### Adding New Data Sources

1. **Add to data sources** (`config/charts/data-sources.ts`):

```typescript
{
  id: 'new_data_source',
  name: 'New Data Source',
  endpoint: '/new/endpoint',
  description: 'Description of the data',
  fields: [
    { key: 'field_name', label: 'Field Label', type: 'number' },
    // Define all available fields
  ],
}
```

2. **Add API method** (`services/api.ts`):

```typescript
async getNewData(params?: any) {
  return this.fetchData('/new/endpoint', params);
}
```

3. **Update chart data hook** (`hooks/useChartData.ts`):

```typescript
case 'new_data_source':
  newData = await apiService.getNewData();
  break;
```

## 🎨 Customizing Charts

### Default Chart Configurations

Edit `config/charts/chart-configs.ts` to change default charts:

```typescript
{
  title: 'My Custom Chart',
  type: 'line', // 'line' | 'bar' | 'pie' | 'area'
  dataSource: 'transactions',
  xAxis: 'time',
  yAxis: 'count',
  refreshInterval: 30000, // 30 seconds
  styling: {
    colors: ['#your-color'],
    showGrid: true,
  },
}
```

### Adding New Chart Types

1. **Update types** (`types/index.ts`):

```typescript
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'your_new_type';
```

2. **Add rendering logic** (`components/dashboard/ChartComponent.tsx`):

```typescript
case 'your_new_type':
  return (
    <ResponsiveContainer width="100%" height={300}>
      <YourNewChart data={data}>
        {/* Chart configuration */}
      </YourNewChart>
    </ResponsiveContainer>
  );
```

