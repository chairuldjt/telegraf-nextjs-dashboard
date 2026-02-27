import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 1, // Strictly one connection to avoid slot exhaustion
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
