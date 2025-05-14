import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { Entity } from './entity';
import { logger } from './utils';

dotenv.config();

// Track entities that are currently being processed
const runningEntities = new Set<string>();

// Function to check if an entity needs to wake up
async function checkEntityWakeUp(entityPath: string): Promise<void> {
  // Skip if this entity is already running
  if (runningEntities.has(entityPath)) {
    logger.info(`Entity at ${entityPath} is already running, skipping`);
    return;
  }

  try {
    // Mark entity as running
    runningEntities.add(entityPath);

    const entity = Entity.importFromFile(entityPath);
    await entity.checkWakeup();
  } catch (error) {
    logger.error(`Error checking entity at ${entityPath}: ${error}`);
  } finally {
    // Remove entity from running set when done
    runningEntities.delete(entityPath);
  }
}

// Function to scan the entities directory
async function scanEntities(): Promise<void> {
  const entitiesDir = path.join(process.cwd(), "entities");

  try {
    const files = fs.readdirSync(entitiesDir);
    const jsons = files.filter((file) => file.endsWith(".json"));
    logger.info(`Found ${jsons.length} entities`);
    const promises = jsons.map((file) => {
      const entityPath = path.join(entitiesDir, file);
      return checkEntityWakeUp(entityPath);
    });
    await Promise.all(promises);
  } catch (error) {
    logger.error(`Error scanning entities directory: ${error}`);
  }
}

// Set up interval to check entities every minute
setInterval(scanEntities, 60000);

// Run once at startup
scanEntities();
