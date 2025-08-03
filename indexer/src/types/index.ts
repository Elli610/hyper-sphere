export interface IndexedBlock {
  number: bigint;
  hash: string;
  parentHash: string;
  timestamp: bigint;
  gasLimit: bigint;
  gasUsed: bigint;
  miner: string;
  difficulty?: bigint;
  totalDifficulty?: bigint;
  size?: number;
  extraData?: string;
  baseFeePerGas?: bigint;
}

export interface IndexedTransaction {
  hash: string;
  blockNumber: bigint;
  blockHash: string;
  transactionIndex: number;
  fromAddress: string;
  toAddress?: string;
  value: bigint;
  gasLimit: bigint;
  gasUsed?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce: bigint;
  inputData?: string;
  status?: number;
  type?: number;
}

export interface IndexedEventLog {
  transactionHash: string;
  blockNumber: bigint;
  blockHash: string;
  logIndex: number;
  address: string;
  topic0?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  data?: string;
  removed: boolean;
}

export interface IndexerConfig {
  rpcUrl: string;
  startBlock: number;
  batchSize: number;
  confirmationBlocks: number;
  contractsToIndex?: string[];
}

export interface IndexerState {
  lastIndexedBlock: bigint;
  lastUpdated: Date;
}