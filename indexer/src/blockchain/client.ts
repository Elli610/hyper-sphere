import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { IndexedBlock, IndexedTransaction, IndexedEventLog } from '../types';

export class BlockchainClient {
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async getLatestBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Failed to get latest block number:', error);
      throw error;
    }
  }

  async getBlock(blockNumber: number): Promise<IndexedBlock> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      return {
        number: BigInt(block.number),
        hash: block.hash || '', // null block should not happen in indexed blocks
        parentHash: block.parentHash,
        timestamp: BigInt(block.timestamp),
        gasLimit: BigInt(block.gasLimit.toString()),
        gasUsed: BigInt(block.gasUsed.toString()),
        miner: block.miner,
        size: block.length || undefined,
        extraData: block.extraData,
        baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas.toString()) : undefined,
      };
    } catch (error) {
      logger.error(`Failed to get block ${blockNumber}:`, error);
      throw error;
    }
  }

  async getTransactionsFromBlock(blockNumber: number): Promise<IndexedTransaction[]> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) {
        return [];
      }

      const transactions: IndexedTransaction[] = [];

      for (let i = 0; i < block.transactions.length; i++) {
        const txHash = block.transactions[i];
        const tx = await this.provider.getTransaction(txHash);
        const receipt = await this.provider.getTransactionReceipt(txHash);

        if (tx && receipt) {
          transactions.push({
            hash: tx.hash,
            blockNumber: BigInt(blockNumber),
            blockHash: block.hash || '', // null block should not happen in indexed blocks
            transactionIndex: i,
            fromAddress: tx.from,
            toAddress: tx.to || undefined,
            value: BigInt(tx.value.toString()),
            gasLimit: BigInt(tx.gasLimit.toString()),
            gasUsed: BigInt(receipt.gasUsed.toString()),
            gasPrice: tx.gasPrice ? BigInt(tx.gasPrice.toString()) : undefined,
            maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas.toString()) : undefined,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas.toString()) : undefined,
            nonce: BigInt(tx.nonce),
            inputData: tx.data,
            status: receipt.status || 0,
            type: tx.type || 0,
          });
        }
      }

      return transactions;
    } catch (error) {
      logger.error(`Failed to get transactions from block ${blockNumber}:`, error);
      throw error;
    }
  }

  async getEventLogsFromBlock(blockNumber: number): Promise<IndexedEventLog[]> {
    try {
      const logs = await this.provider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });

      return logs.map((log, index) => ({
        transactionHash: log.transactionHash,
        blockNumber: BigInt(log.blockNumber),
        blockHash: log.blockHash,
        logIndex: log.index,
        address: log.address,
        topic0: log.topics[0] || undefined,
        topic1: log.topics[1] || undefined,
        topic2: log.topics[2] || undefined,
        topic3: log.topics[3] || undefined,
        data: log.data,
        removed: log.removed || false,
      }));
    } catch (error) {
      logger.error(`Failed to get event logs from block ${blockNumber}:`, error);
      throw error;
    }
  }

  async getEventLogsForContracts(
    blockNumber: number, 
    contractAddresses: string[] | undefined
  ): Promise<IndexedEventLog[]> {
    try {
      const logs = await this.provider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
        address: contractAddresses,
      });

      return logs.map((log) => ({
        transactionHash: log.transactionHash,
        blockNumber: BigInt(log.blockNumber),
        blockHash: log.blockHash,
        logIndex: log.index,
        address: log.address,
        topic0: log.topics[0] || undefined,
        topic1: log.topics[1] || undefined,
        topic2: log.topics[2] || undefined,
        topic3: log.topics[3] || undefined,
        data: log.data,
        removed: log.removed || false,
      }));
    } catch (error) {
      logger.error(`Failed to get event logs for contracts from block ${blockNumber}:`, error);
      throw error;
    }
  }
}