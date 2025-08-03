import * as fs from 'fs';
import * as path from 'path';
import { database } from '../database/connection';
import { logger } from '../utils/logger';
import "dotenv/config";

async function runMigrations(): Promise<void> {
  try {
    logger.info('Running database migrations...');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await database.connect();
    await database.query(schema);
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  runMigrations();
}