import dotenv from 'dotenv';

dotenv.config();

export const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || "http://localhost:8000",
};

export default API_CONFIG;
