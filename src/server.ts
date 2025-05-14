import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';

import { ADAPTERS } from './adapters/list';
import { Entity } from './entity';
import { Memory } from './memory';
import { logger } from './utils';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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

// Ensure entities directory exists
const entitiesDir = path.join(process.cwd(), "entities");
if (!fs.existsSync(entitiesDir)) {
  fs.mkdirSync(entitiesDir, { recursive: true });
}

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
    const entityPath = path.join(entitiesDir, `${id}.json`);
    if (fs.existsSync(entityPath)) {
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

    // Export entity to file
    entity.exportToFile(entityPath);

    logger.info(`Created new entity with ID: ${id} with all adapters enabled`);

    res.status(201).json({
      id,
      message: "Entity created successfully with all adapters enabled",
      entity_path: entityPath,
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

    const entityPath = path.join(entitiesDir, `${id}.json`);

    if (!fs.existsSync(entityPath)) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = Entity.importFromFile(entityPath);

    res.json({
      id: entity.options.id,
      model: entity.options.model,
      adapters: entity.options.adapters?.map((a) => a.name) || [],
      created_at: fs.statSync(entityPath).birthtime,
      last_modified: fs.statSync(entityPath).mtime,
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

    const entityPath = path.join(entitiesDir, `${id}.json`);

    if (!fs.existsSync(entityPath)) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Delete the entity file
    fs.unlinkSync(entityPath);

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
    const { entity_access_key } = req.body;

    if (!entity_access_key) {
      return res
        .status(400)
        .json({ error: "Missing entity_access_key in request body" });
    }

    const entityPath = path.join(entitiesDir, `${id}.json`);

    if (!fs.existsSync(entityPath)) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify entity access key
    const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));

    if (entityData.access_key !== entity_access_key) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid entity access key." });
    }

    // Load the entity
    const entity = Entity.importFromFile(entityPath);

    // Set sleepUntil to null to wake the entity
    entity.options.sleepUntil = null;

    // Save entity
    entity.exportToFile(entityPath);

    // Start the entity's run process in the background
    entity.run().catch((error) => {
      logger.error(`Error running entity ${id}: ${error}`);
    });

    logger.info(`Woke entity with ID: ${id}`);

    res.status(200).json({
      id: entity.options.id,
      message: "Entity awakened successfully",
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

    const entityPath = path.join(entitiesDir, `${id}.json`);

    if (!fs.existsSync(entityPath)) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = Entity.importFromFile(entityPath);

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
    entity.exportToFile(entityPath);

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

    const entityPath = path.join(entitiesDir, `${id}.json`);

    if (!fs.existsSync(entityPath)) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = Entity.importFromFile(entityPath);

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

    const entityPath = path.join(entitiesDir, `${id}.json`);

    if (!fs.existsSync(entityPath)) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // Read entity file to verify access key
    const entityData = JSON.parse(fs.readFileSync(entityPath, "utf8"));

    if (entityData.access_key !== accessKey) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Invalid access key for this entity." });
    }

    // Load the entity
    const entity = Entity.importFromFile(entityPath);

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
    entity.exportToFile(entityPath);

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
});

export default app;
