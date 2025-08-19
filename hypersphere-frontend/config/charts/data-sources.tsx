import { DataSource } from '../../types';

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'transactions',
    name: 'Transaction Activity',
    endpoint: '/tx/timeseries',
    description: 'Real-time transaction timeseries data from HyperEVM',
    fields: [
      { key: 'timestamp', label: 'Time', type: 'date' },
      { key: 'count', label: 'Transaction Count', type: 'number' },
      { key: 'avg_gas', label: 'Average Gas Price', type: 'number' },
      { key: 'total_gas', label: 'Total Gas Used', type: 'number' },
    ],
  },
  {
    id: 'tokens',
    name: 'Top Tokens',
    endpoint: '/tokens/top',
    description: 'Most active tokens by transfer count and volume',
    fields: [
      { key: 'symbol', label: 'Token Symbol', type: 'string' },
      { key: 'name', label: 'Token Name', type: 'string' },
      { key: 'transfers', label: 'Transfer Count', type: 'number' },
      { key: 'volume', label: 'Volume (USD)', type: 'number' },
    ],
  },
  {
    id: 'flows',
    name: 'Transaction Flows',
    endpoint: '/flows/basic',
    description: 'Basic transaction flows between addresses',
    fields: [
      { key: 'from_address', label: 'From Address', type: 'string' },
      { key: 'to_address', label: 'To Address', type: 'string' },
      { key: 'count', label: 'Transaction Count', type: 'number' },
      { key: 'token', label: 'Token', type: 'string' },
    ],
  },
  {
    id: 'gas',
    name: 'Gas Analytics',
    endpoint: '/gas/timeseries',
    description: 'Gas usage and pricing timeseries data',
    fields: [
      { key: 'timestamp', label: 'Time', type: 'date' },
      { key: 'avg_gas_price', label: 'Average Gas Price', type: 'number' },
      { key: 'max_gas_price', label: 'Max Gas Price', type: 'number' },
      { key: 'min_gas_price', label: 'Min Gas Price', type: 'number' },
    ],
  },
  {
    id: 'flows_amounts',
    name: 'Flow Amounts',
    endpoint: '/flows/amounts',
    description: 'Transaction flows with amount data',
    fields: [
      { key: 'from_address', label: 'From Address', type: 'string' },
      { key: 'to_address', label: 'To Address', type: 'string' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'token', label: 'Token', type: 'string' },
    ],
  },
  {
    id: 'events',
    name: 'Event Types',
    endpoint: '/events/types',
    description: 'Available event types in the system',
    fields: [
      { key: 'event_type', label: 'Event Type', type: 'string' },
      { key: 'count', label: 'Count', type: 'number' },
      { key: 'description', label: 'Description', type: 'string' },
    ],
  },
];