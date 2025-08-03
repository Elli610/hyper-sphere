import { BlockchainClient } from '../blockchain/client';
import { repository } from '../database/repository';
import { logger } from '../utils/logger';
import { IndexerConfig } from '../types';

export class IndexerService {
  private client: BlockchainClient;
  private config: IndexerConfig;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private consecutiveErrors: number = 0;
  private maxRetries: number = Infinity; // Retry indefinitely
  private baseDelay: number = 1000; // 1 second base delay

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
        const latestBlock = await this.executeWithRetry(
          () => this.client.getLatestBlockNumber(),
          'getLatestBlockNumber'
        );
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

        // Reset consecutive errors on successful batch
        this.consecutiveErrors = 0;

        // Short delay between batches to prevent overwhelming the RPC
        await this.sleep(100);
      } catch (error) {
        this.consecutiveErrors++;
        logger.error(`Error processing block ${currentBlock} (consecutive errors: ${this.consecutiveErrors}):`, error);
        
        // Calculate backoff delay based on consecutive errors
        const backoffDelay = this.calculateBackoffDelay(this.consecutiveErrors);
        logger.warn(`Backing off for ${backoffDelay}ms before retrying...`);
        
        await this.sleep(backoffDelay);

        // If too many consecutive errors, pause but don't give up
        if (this.consecutiveErrors >= 20) {
          logger.error(`${this.consecutiveErrors} consecutive errors, pausing for extended period but will continue...`);
          await this.sleep(300000); // Wait 5 minutes
          // Don't reset consecutiveErrors - let the backoff continue to grow
        }
      }
    }

    logger.info('Indexer stopped gracefully');
  }

  private async processBatch(startBlock: number, endBlock: number): Promise<void> {
    // Process blocks sequentially to avoid overwhelming the RPC with parallel requests
    // during error conditions
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      if (this.shouldStop) break;
      
      await this.processBlockWithRetry(blockNumber);
      
      // Small delay between blocks when processing sequentially
      if (this.consecutiveErrors > 0) {
        await this.sleep(200);
      }
    }
  }

  private async processBlockWithRetry(blockNumber: number): Promise<void> {
    return this.executeWithRetry(
      () => this.processBlock(blockNumber),
      `processBlock-${blockNumber}`
    );
  }

  private async processBlock(blockNumber: number): Promise<void> {
    try {
      logger.debug(`Processing block ${blockNumber}`);

      // Get block data with individual retry logic
      const block = await this.executeWithRetry(
        () => this.client.getBlock(blockNumber),
        `getBlock-${blockNumber}`
      );
      
      const transactions = await this.executeWithRetry(
        () => this.client.getTransactionsFromBlock(blockNumber),
        `getTransactions-${blockNumber}`
      );
      
      // Get event logs (either all or filtered by contracts)
      const logs = this.config.contractsToIndex && this.config.contractsToIndex.length > 0
        ? await this.executeWithRetry(
            () => this.client.getEventLogsForContracts(blockNumber, this.config.contractsToIndex),
            `getEventLogsForContracts-${blockNumber}`
          )
        : await this.executeWithRetry(
            () => this.client.getEventLogsFromBlock(blockNumber),
            `getEventLogsFromBlock-${blockNumber}`
          );

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

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let attempt = 1;
    
    while (!this.shouldStop) {
      try {
        return await operation();
      } catch (error: any) {
        // Check if this is a retryable error (502, 503, 504, network issues)
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable) {
          logger.error(`Non-retryable error in ${operationName}:`, error);
          throw error;
        }

        const delay = this.calculateRetryDelay(attempt);
        logger.warn(`${operationName} failed (attempt ${attempt}), retrying in ${delay}ms...`, {
          error: error.shortMessage || error.message,
          code: error.code
        });
        
        await this.sleep(delay);
        attempt++;
        
        // Log milestone attempts
        if (attempt % 10 === 0) {
          logger.warn(`${operationName} has been retrying for ${attempt} attempts. Still trying...`);
        }
      }
    }
    
    throw new Error(`Operation ${operationName} was cancelled due to indexer stop`);
  }

  private isRetryableError(error: any): boolean {
    // Check for 502 Bad Gateway and other server errors
    if (error.code === 'SERVER_ERROR') {
      const responseStatus = error.info?.responseStatus;
      return responseStatus === '502 Bad Gateway' || 
             responseStatus === '503 Service Unavailable' ||
             responseStatus === '504 Gateway Timeout';
    }
    
    // Check for network errors
    if (error.code === 'NETWORK_ERROR' || 
        error.code === 'TIMEOUT' ||
        error.code === 'CONNECTION_ERROR') {
      return true;
    }
    
    // Check for rate limiting
    if (error.code === 'CALL_EXCEPTION' && 
        error.message?.includes('rate limit')) {
      return true;
    }
    
    return false;
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter: base * 2^attempt + random(0, 1000)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private calculateBackoffDelay(consecutiveErrors: number): number {
    // Progressive backoff for consecutive errors, capped at 5 minutes
    const delays = [1000, 2000, 5000, 10000, 30000, 60000, 120000, 300000];
    const index = Math.min(consecutiveErrors - 1, delays.length - 1);
    return delays[index];
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
    const latestNetworkBlock = await this.executeWithRetry(
      () => this.client.getLatestBlockNumber(),
      'getLatestBlockNumber-progress'
    );
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

  // Additional method to get indexer health status
  getIndexerStatus(): {
    isRunning: boolean;
    consecutiveErrors: number;
    isHealthy: boolean;
  } {
    return {
      isRunning: this.isRunning,
      consecutiveErrors: this.consecutiveErrors,
      isHealthy: this.consecutiveErrors < 5
    };
  }
}