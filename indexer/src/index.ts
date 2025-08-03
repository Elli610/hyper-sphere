import * as dotenv from 'dotenv';
import { database } from './database/connection';
import { IndexerService } from './services/indexer';
import { logger } from './utils/logger';
import { IndexerConfig } from './types';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  try {
    // Create logs directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }

    // Validate required environment variables
    const requiredEnvVars = ['RPC_URL', 'DB_PASSWORD'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize database connection
    await database.connect();

    // Parse contracts to index if provided
    const contractsToIndex = process.env.CONTRACTS_TO_INDEX
      ? process.env.CONTRACTS_TO_INDEX.split(',').map(addr => addr.trim())
      : undefined;

    // Create indexer configuration
    const config: IndexerConfig = {
      rpcUrl: process.env.RPC_URL!,
      startBlock: parseInt(process.env.START_BLOCK || '0'),
      batchSize: parseInt(process.env.BATCH_SIZE || '10'),
      confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '12'),
      contractsToIndex,
    };

    logger.debug('Starting EVM Indexer with configuration:', { ...config, rpcUrl: '***' }); // Hide RPC URL in logs

    // Create and start indexer
    const indexer = new IndexerService(config);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      indexer.stop();
      
      // Wait a bit for the indexer to stop
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await database.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      indexer.stop();
      
      // Wait a bit for the indexer to stop
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await database.close();
      process.exit(0);
    });

    // Start indexing
    await indexer.start();

  } catch (error) {
    logger.error('Failed to start indexer:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}