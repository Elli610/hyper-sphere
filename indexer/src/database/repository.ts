import { PoolClient } from 'pg';
import { database } from './connection';
import { IndexedBlock, IndexedTransaction, IndexedEventLog, IndexerState } from '../types';
import { logger } from '../utils/logger';

export class DatabaseRepository {
  async getLastIndexedBlock(): Promise<bigint> {
    try {
      const result = await database.query(
        'SELECT last_indexed_block FROM indexer_state WHERE id = 1'
      );
      return BigInt(result.rows[0]?.last_indexed_block || 0);
    } catch (error) {
      logger.error('Failed to get last indexed block:', error);
      throw error;
    }
  }

  async updateLastIndexedBlock(blockNumber: bigint): Promise<void> {
    try {
      await database.query(
        'UPDATE indexer_state SET last_indexed_block = $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1',
        [blockNumber.toString()]
      );
    } catch (error) {
      logger.error('Failed to update last indexed block:', error);
      throw error;
    }
  }

  async insertBlock(block: IndexedBlock): Promise<void> {
    try {
      await database.query(`
        INSERT INTO blocks (
          number, hash, parent_hash, timestamp, gas_limit, gas_used, miner,
          difficulty, total_difficulty, size, extra_data, base_fee_per_gas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (number) DO UPDATE SET
          hash = EXCLUDED.hash,
          parent_hash = EXCLUDED.parent_hash,
          timestamp = EXCLUDED.timestamp,
          gas_limit = EXCLUDED.gas_limit,
          gas_used = EXCLUDED.gas_used,
          miner = EXCLUDED.miner,
          difficulty = EXCLUDED.difficulty,
          total_difficulty = EXCLUDED.total_difficulty,
          size = EXCLUDED.size,
          extra_data = EXCLUDED.extra_data,
          base_fee_per_gas = EXCLUDED.base_fee_per_gas,
          updated_at = CURRENT_TIMESTAMP
      `, [
        block.number.toString(),
        block.hash,
        block.parentHash,
        block.timestamp.toString(),
        block.gasLimit.toString(),
        block.gasUsed.toString(),
        block.miner,
        block.difficulty?.toString() || null,
        block.totalDifficulty?.toString() || null,
        block.size || null,
        block.extraData || null,
        block.baseFeePerGas?.toString() || null,
      ]);
    } catch (error) {
      logger.error('Failed to insert block:', error);
      throw error;
    }
  }

  async insertTransactions(transactions: IndexedTransaction[]): Promise<void> {
    if (transactions.length === 0) return;

    try {
      const values = transactions.map(tx => [
        tx.hash,
        tx.blockNumber.toString(),
        tx.blockHash,
        tx.transactionIndex,
        tx.fromAddress,
        tx.toAddress || null,
        tx.value.toString(),
        tx.gasLimit.toString(),
        tx.gasUsed?.toString() || null,
        tx.gasPrice?.toString() || null,
        tx.maxFeePerGas?.toString() || null,
        tx.maxPriorityFeePerGas?.toString() || null,
        tx.nonce.toString(),
        tx.inputData || null,
        tx.status || null,
        tx.type || 0,
      ]);

      const placeholders = values.map((_, i) => 
        `($${i * 16 + 1}, $${i * 16 + 2}, $${i * 16 + 3}, $${i * 16 + 4}, $${i * 16 + 5}, $${i * 16 + 6}, $${i * 16 + 7}, $${i * 16 + 8}, $${i * 16 + 9}, $${i * 16 + 10}, $${i * 16 + 11}, $${i * 16 + 12}, $${i * 16 + 13}, $${i * 16 + 14}, $${i * 16 + 15}, $${i * 16 + 16})`
      ).join(', ');

      await database.query(`
        INSERT INTO transactions (
          hash, block_number, block_hash, transaction_index, from_address, to_address,
          value, gas_limit, gas_used, gas_price, max_fee_per_gas, max_priority_fee_per_gas,
          nonce, input_data, status, type
        ) VALUES ${placeholders}
        ON CONFLICT (hash) DO UPDATE SET
          gas_used = EXCLUDED.gas_used,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, values.flat());
    } catch (error) {
      logger.error('Failed to insert transactions:', error);
      throw error;
    }
  }

  async insertEventLogs(logs: IndexedEventLog[]): Promise<void> {
    if (logs.length === 0) return;

    try {
      const values = logs.map(log => [
        log.transactionHash,
        log.blockNumber.toString(),
        log.blockHash,
        log.logIndex,
        log.address,
        log.topic0 || null,
        log.topic1 || null,
        log.topic2 || null,
        log.topic3 || null,
        log.data || null,
        log.removed,
      ]);

      const placeholders = values.map((_, i) => 
        `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`
      ).join(', ');

      await database.query(`
        INSERT INTO event_logs (
          transaction_hash, block_number, block_hash, log_index, address,
          topic0, topic1, topic2, topic3, data, removed
        ) VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `, values.flat());
    } catch (error) {
      logger.error('Failed to insert event logs:', error);
      throw error;
    }
  }

  async insertBlockData(
    block: IndexedBlock,
    transactions: IndexedTransaction[],
    logs: IndexedEventLog[]
  ): Promise<void> {
    try {
      await database.transaction(async (client: PoolClient) => {
        // Insert block
        await client.query(`
          INSERT INTO blocks (
            number, hash, parent_hash, timestamp, gas_limit, gas_used, miner,
            difficulty, total_difficulty, size, extra_data, base_fee_per_gas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (number) DO UPDATE SET
            hash = EXCLUDED.hash,
            parent_hash = EXCLUDED.parent_hash,
            timestamp = EXCLUDED.timestamp,
            gas_limit = EXCLUDED.gas_limit,
            gas_used = EXCLUDED.gas_used,
            miner = EXCLUDED.miner,
            difficulty = EXCLUDED.difficulty,
            total_difficulty = EXCLUDED.total_difficulty,
            size = EXCLUDED.size,
            extra_data = EXCLUDED.extra_data,
            base_fee_per_gas = EXCLUDED.base_fee_per_gas,
            updated_at = CURRENT_TIMESTAMP
        `, [
          block.number.toString(),
          block.hash,
          block.parentHash,
          block.timestamp.toString(),
          block.gasLimit.toString(),
          block.gasUsed.toString(),
          block.miner,
          block.difficulty?.toString() || null,
          block.totalDifficulty?.toString() || null,
          block.size || null,
          block.extraData || null,
          block.baseFeePerGas?.toString() || null,
        ]);

        // Insert transactions
        if (transactions.length > 0) {
          for (const tx of transactions) {
            await client.query(`
              INSERT INTO transactions (
                hash, block_number, block_hash, transaction_index, from_address, to_address,
                value, gas_limit, gas_used, gas_price, max_fee_per_gas, max_priority_fee_per_gas,
                nonce, input_data, status, type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
              ON CONFLICT (hash) DO UPDATE SET
                gas_used = EXCLUDED.gas_used,
                status = EXCLUDED.status,
                updated_at = CURRENT_TIMESTAMP
            `, [
              tx.hash,
              tx.blockNumber.toString(),
              tx.blockHash,
              tx.transactionIndex,
              tx.fromAddress,
              tx.toAddress || null,
              tx.value.toString(),
              tx.gasLimit.toString(),
              tx.gasUsed?.toString() || null,
              tx.gasPrice?.toString() || null,
              tx.maxFeePerGas?.toString() || null,
              tx.maxPriorityFeePerGas?.toString() || null,
              tx.nonce.toString(),
              tx.inputData || null,
              tx.status || null,
              tx.type || 0,
            ]);
          }
        }

        // Insert event logs
        if (logs.length > 0) {
          for (const log of logs) {
            await client.query(`
              INSERT INTO event_logs (
                transaction_hash, block_number, block_hash, log_index, address,
                topic0, topic1, topic2, topic3, data, removed
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT DO NOTHING
            `, [
              log.transactionHash,
              log.blockNumber.toString(),
              log.blockHash,
              log.logIndex,
              log.address,
              log.topic0 || null,
              log.topic1 || null,
              log.topic2 || null,
              log.topic3 || null,
              log.data || null,
              log.removed,
            ]);
          }
        }

        // Update indexer state
        await client.query(
          'UPDATE indexer_state SET last_indexed_block = $1, last_updated = CURRENT_TIMESTAMP WHERE id = 1',
          [block.number.toString()]
        );
      });
    } catch (error) {
      logger.error('Failed to insert block data:', error);
      throw error;
    }
  }

  async getBlockByNumber(blockNumber: bigint): Promise<IndexedBlock | null> {
    try {
      const result = await database.query(
        'SELECT * FROM blocks WHERE number = $1',
        [blockNumber.toString()]
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        number: BigInt(row.number),
        hash: row.hash,
        parentHash: row.parent_hash,
        timestamp: BigInt(row.timestamp),
        gasLimit: BigInt(row.gas_limit),
        gasUsed: BigInt(row.gas_used),
        miner: row.miner,
        difficulty: row.difficulty ? BigInt(row.difficulty) : undefined,
        totalDifficulty: row.total_difficulty ? BigInt(row.total_difficulty) : undefined,
        size: row.size,
        extraData: row.extra_data,
        baseFeePerGas: row.base_fee_per_gas ? BigInt(row.base_fee_per_gas) : undefined,
      };
    } catch (error) {
      logger.error('Failed to get block by number:', error);
      throw error;
    }
  }
}

export const repository = new DatabaseRepository();