import dotenv from 'dotenv';

import { Entity } from './entity';
import {
  getEntitiesListKey,
  redis,
} from './redis/config';
import { logger } from './utils';

dotenv.config();

// Track entities that are currently being processed
const runningEntities = new Set<string>();

// Function to check if an entity needs to wake up
async function checkEntityWakeUp(entityId: string): Promise<void> {
  // Skip if this entity is already running
  if (runningEntities.has(entityId)) {
    logger.info(`Entity ${entityId} is already running, skipping`);
    return;
  }

  try {
    // Mark entity as running
    runningEntities.add(entityId);

    const entity = await Entity.importFromRedis(entityId);
    await entity.checkWakeup();
  } catch (error) {
    logger.error(`Error checking entity ${entityId}: ${error}`);
  } finally {
    // Remove entity from running set when done
    runningEntities.delete(entityId);
  }
}

// Function to scan entities from Redis
async function scanEntities(): Promise<void> {
  try {
    // Get all entity IDs from Redis set
    const entityIds = await redis.smembers(getEntitiesListKey());
    logger.info(`Found ${entityIds.length} entities in Redis`);

    const promises = entityIds.map((entityId) => checkEntityWakeUp(entityId));
    await Promise.all(promises);
  } catch (error) {
    logger.error(`Error scanning entities in Redis: ${error}`);
  }
}

// Set up interval to check entities every minute
setInterval(scanEntities, 60000);

// Run once at startup
scanEntities();
