import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { RequestHandler } from 'express';

import { ADAPTERS } from './adapters/list';
import { Entity } from './entity';
import { Memory } from './memory';
import {
  getEntitiesListKey,
  getEntityKey,
  redis,
} from './redis/config';
import { logger } from './utils';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const runningEntityIds: Set<string> = new Set();

// Use JSON middleware
app.use(bodyParser.json());

// Simple access key validation middleware
const validateAccessKey: RequestHandler = (req, res, next) => {
  const accessKey = req.headers["x-access-key"];

  if (!accessKey || accessKey !== process.env.MASTER_ACCESS_KEY) {
    res.status(401).json({ error: "Unauthorized. Invalid access key." });
    return;
  }

  next();
};

// Function to check which entities should wake up
const checkEntitiesForWakeup = async () => {
  try {
    logger.info("Checking for entities that need to wake up");

    // Get all entity IDs from Redis
    const entityIds = await redis.smembers(getEntitiesListKey());

    // Check each entity if it's time to wake up
    for (const id of entityIds) {
      // Skip if this entity is already running
      if (runningEntityIds.has(id)) {
        logger.info(
          `Skipping wakeup check for entity ${id} as it's already running`
        );
        continue;
      }

      const entity = await Entity.importFromRedis(id);

      // If it's time to wake up, mark as running before starting
      if (
        entity.options.sleepUntil === null ||
        (entity.options.sleepUntil &&
          entity.getCurrentTime() >= entity.options.sleepUntil)
      ) {
        runningEntityIds.add(id);

        entity
          .run()
          .catch((error) => {
            logger.error(`Error running entity ${id}: ${error}`);
          })
          .finally(() => {
            runningEntityIds.delete(id);
          });
      } else {
        const sleepUntilTime = entity.options.sleepUntil
          ? entity.options.sleepUntil.toISOString()
          : "unknown time";
        logger.info(
          `Entity ${id} not ready to wake up yet, sleeping until ${sleepUntilTime}`
        );
      }
    }
  } catch (error) {
    logger.error(`Error checking entities for wakeup: ${error}`);
  }
};

// Register a new entity
app.post("/api/entities", validateAccessKey, (async (req, res) => {
  try {
    const { id, model, access_key, adapters = [] } = req.body;

    if (!id || !model || !access_key) {
      return res
        .status(400)
        .json({ error: "Missing required fields: id, model, or access_key" });
    }

    // Check if entity already exists
    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (exists) {
      return res
        .status(409)
        .json({ error: "Entity with this ID already exists" });
    }

    // Create new entity with all adapters enabled by default
    const entity = new Entity({
      id,
      model,
      stm: new Memory({}, model),
      ltm: new Memory({}, model),
      adapters: ADAPTERS, // Add all adapters by default
      timeOffset: 0,
      sleepUntil: null,
      access_key,
    });

    // Export entity to Redis
    await entity.exportToRedis();

    logger.info(`Created new entity with ID: ${id} with all adapters enabled`);

    res.status(201).json({
      id,
      message: "Entity created successfully with all adapters enabled",
      adapters: ADAPTERS.map((adapter) => adapter.name),
    });
  } catch (error) {
    logger.error(`Error creating entity: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Get entity information
app.get("/api/entities/:id", (async (req, res) => {
  try {
    const { id } = req.params;
    const accessKey = req.headers["x-access-key"];

    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (!exists) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse((await redis.get(entityKey)) || "{}");

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = await Entity.importFromRedis(id);

    res.json({
      id: entity.options.id,
      model: entity.options.model,
      adapters: entity.options.adapters?.map((a) => a.name) || [],
      created_at: entityData.created_at,
      last_modified: entityData.last_modified,
    });
  } catch (error) {
    logger.error(`Error getting entity: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Delete an entity
app.delete("/api/entities/:id", (async (req, res) => {
  try {
    const { id } = req.params;
    const accessKey = req.headers["x-access-key"];

    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (!exists) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse((await redis.get(entityKey)) || "{}");

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Delete the entity from Redis
    await redis.del(entityKey);

    logger.info(`Deleted entity with ID: ${id}`);

    res.status(204).end();
  } catch (error) {
    logger.error(`Error deleting entity: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Wake an entity
app.post("/api/entities/:id/wake", validateAccessKey, (async (req, res) => {
  try {
    const { id } = req.params;
    const { entity_access_key, delay } = req.body;

    if (!entity_access_key) {
      return res
        .status(400)
        .json({ error: "Missing entity_access_key in request body" });
    }

    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (!exists) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify entity access key
    const entityData = JSON.parse((await redis.get(entityKey)) || "{}");

    if (entityData.access_key !== entity_access_key) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid entity access key." });
    }

    // Load the entity
    const entity = await Entity.importFromRedis(id);

    // Set sleepUntil to null to wake the entity
    entity.options.sleepUntil = null;

    // Save entity
    await entity.exportToRedis();

    // Start the entity's run process in the background with optional delay
    const runEntity = async () => {
      if (runningEntityIds.has(id)) {
        logger.error(`Entity with ID: ${id} is already running`);
        return;
      }

      runningEntityIds.add(id);

      await entity
        .run()
        .catch((error) => {
          logger.error(`Error running entity ${id}: ${error}`);
        })
        .finally(() => {
          runningEntityIds.delete(id);
        });
    };

    if (delay && typeof delay === "number") {
      setTimeout(runEntity, delay * 1000);
      logger.info(`Entity with ID: ${id} will wake up in ${delay} seconds`);
    } else {
      runEntity();
      logger.info(`Woke entity with ID: ${id}`);
    }

    res.status(200).json({
      id: entity.options.id,
      message: "Entity awakened successfully",
      delay: delay ? `Will start in ${delay} seconds` : undefined,
    });
  } catch (error) {
    logger.error(`Error waking entity: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Add adapter to entity
app.post("/api/entities/:id/adapters", (async (req, res) => {
  try {
    const { id } = req.params;
    const { adapter_name } = req.body;
    const accessKey = req.headers["x-access-key"];

    if (!adapter_name) {
      return res
        .status(400)
        .json({ error: "Missing adapter_name in request body" });
    }

    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (!exists) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse((await redis.get(entityKey)) || "{}");

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = await Entity.importFromRedis(id);

    // Find adapter in available adapters
    const adapterToAdd = ADAPTERS.find((a) => a.name === adapter_name);

    if (!adapterToAdd) {
      return res
        .status(404)
        .json({ error: `Adapter '${adapter_name}' not found` });
    }

    // Check if adapter is already added to entity
    const existingAdapter = entity.options.adapters?.find(
      (a) => a.name === adapter_name
    );

    if (existingAdapter) {
      return res.status(409).json({
        error: `Adapter '${adapter_name}' is already added to entity`,
      });
    }

    // Add adapter to entity
    entity.options.adapters = [
      ...(entity.options.adapters || []),
      adapterToAdd,
    ];

    // Save entity
    await entity.exportToRedis();

    logger.info(`Added adapter '${adapter_name}' to entity ${id}`);

    res.json({
      id: entity.options.id,
      adapters: entity.options.adapters.map((a) => a.name),
    });
  } catch (error) {
    logger.error(`Error adding adapter to entity: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Get entity adapters
app.get("/api/entities/:id/adapters", (async (req, res) => {
  try {
    const { id } = req.params;
    const accessKey = req.headers["x-access-key"];

    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (!exists) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse((await redis.get(entityKey)) || "{}");

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = await Entity.importFromRedis(id);

    res.json({
      adapters:
        entity.options.adapters?.map((a) => ({
          name: a.name,
          description: a.description,
          tools: a.tools.map((t) => ({
            name: t.name,
            description: t.description,
          })),
        })) || [],
    });
  } catch (error) {
    logger.error(`Error getting entity adapters: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Remove adapter from entity
app.delete("/api/entities/:id/adapters/:adapter", (async (req, res) => {
  try {
    const { id, adapter } = req.params;
    const accessKey = req.headers["x-access-key"];

    const entityKey = getEntityKey(id);
    const exists = await redis.exists(entityKey);
    if (!exists) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse((await redis.get(entityKey)) || "{}");

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = await Entity.importFromRedis(id);

    // Check if adapter exists in entity
    const adapterIndex = entity.options.adapters?.findIndex(
      (a) => a.name === adapter
    );

    if (adapterIndex === undefined || adapterIndex === -1) {
      return res
        .status(404)
        .json({ error: `Adapter '${adapter}' not found in entity` });
    }

    // Remove adapter from entity
    entity.options.adapters?.splice(adapterIndex, 1);

    // Save entity
    await entity.exportToRedis();

    logger.info(`Removed adapter '${adapter}' from entity ${id}`);

    res.status(204).end();
  } catch (error) {
    logger.error(`Error removing adapter from entity: ${error}`);
    res.status(500).json({ error: "Internal server error" });
  }
}) as RequestHandler);

// Start the server
app.listen(port, () => {
  logger.info(`Entity server running on port ${port}`);

  // Start the interval to check for entities that need to wake up every minute
  setInterval(checkEntitiesForWakeup, 60000);

  // Also run once on startup
  checkEntitiesForWakeup();
});

export default app;
