import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL);

export const ENTITY_KEY_PREFIX = "entity:";

export const getEntityKey = (entityId: string) => {
  return `${ENTITY_KEY_PREFIX}${entityId}`;
};

export const getEntitiesListKey = () => {
  return `${ENTITY_KEY_PREFIX}list`;
};

export const CONTACTS_KEY_PREFIX = "contacts:";

export const getContactKey = (entityId: string, contactId: string) => {
  return `${CONTACTS_KEY_PREFIX}${entityId}:${contactId}`;
};

export const getEntityContactsKey = (entityId: string) => {
  return `${CONTACTS_KEY_PREFIX}${entityId}:list`;
};
