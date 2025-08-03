import { BlockchainClient } from '../blockchain/client';
import { repository } from '../database/repository';
import { logger } from '../utils/logger';
import { IndexerConfig } from '../types';

export class IndexerService {
  private client: BlockchainClient;
  private config: IndexerConfig;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(config: IndexerConfig) {
    this.config = config;
    this.client = new BlockchainClient(config.rpcUrl);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;
    logger.info('Starting EVM indexer...', { config: this.config });

    try {
      await this.indexBlocks();
    } catch (error) {
      logger.error('Indexer stopped due to error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    logger.info('Stopping indexer...');
    this.shouldStop = true;
  }

  private async indexBlocks(): Promise<void> {
    let lastIndexedBlock = await repository.getLastIndexedBlock();
    const startBlock = lastIndexedBlock === 0n ? BigInt(this.config.startBlock) : lastIndexedBlock + 1n;
    
    logger.info(`Starting indexing from block ${startBlock}`);

    let currentBlock = Number(startBlock);

    while (!this.shouldStop) {
      try {
        const latestBlock = await this.client.getLatestBlockNumber();
        const targetBlock = latestBlock - this.config.confirmationBlocks;

        if (currentBlock > targetBlock) {
          logger.debug(`Waiting for new blocks. Current: ${currentBlock}, Target: ${targetBlock}`);
          await this.sleep(5000); // Wait 5 seconds
          continue;
        }

        const endBlock = Math.min(currentBlock + this.config.batchSize - 1, targetBlock);
        logger.info(`Indexing blocks ${currentBlock} to ${endBlock}`);

        await this.processBatch(currentBlock, endBlock);
        currentBlock = endBlock + 1;

        // Short delay between batches to prevent overwhelming the RPC
        await this.sleep(100);
      } catch (error) {
        logger.error(`Error processing block ${currentBlock}:`, error);
        
        // Exponential backoff on error
        await this.sleep(Math.min(5000 * Math.pow(2, 1), 30000));
      }
    }

    logger.info('Indexer stopped gracefully');
  }

  private async processBatch(startBlock: number, endBlock: number): Promise<void> {
    const promises = [];
    
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      promises.push(this.processBlock(blockNumber));
    }

    await Promise.all(promises);
  }

  private async processBlock(blockNumber: number): Promise<void> {
    try {
      logger.debug(`Processing block ${blockNumber}`);

      // Get block data
      const block = await this.client.getBlock(blockNumber);
      const transactions = await this.client.getTransactionsFromBlock(blockNumber);
      
      // Get event logs (either all or filtered by contracts)
      const logs = this.config.contractsToIndex && this.config.contractsToIndex.length > 0
        ? await this.client.getEventLogsForContracts(blockNumber, this.config.contractsToIndex)
        : await this.client.getEventLogsFromBlock(blockNumber);

      // Store all data in a transaction
      await repository.insertBlockData(block, transactions, logs);

      logger.debug(`Successfully processed block ${blockNumber}`, {
        transactions: transactions.length,
        logs: logs.length,
      });
    } catch (error) {
      logger.error(`Failed to process block ${blockNumber}:`, error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getIndexingProgress(): Promise<{
    lastIndexedBlock: bigint;
    latestNetworkBlock: number;
    blocksRemaining: number;
  }> {
    const lastIndexedBlock = await repository.getLastIndexedBlock();
    const latestNetworkBlock = await this.client.getLatestBlockNumber();
    const targetBlock = latestNetworkBlock - this.config.confirmationBlocks;
    const blocksRemaining = Math.max(0, targetBlock - Number(lastIndexedBlock));

    return {
      lastIndexedBlock,
      latestNetworkBlock,
      blocksRemaining,
    };
  }

  isIndexerRunning(): boolean {
    return this.isRunning;
  }
}