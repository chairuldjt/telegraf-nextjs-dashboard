import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 10, // Limit maximum connections to avoid exhaustion
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error if a connection cannot be established within 5 seconds
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
