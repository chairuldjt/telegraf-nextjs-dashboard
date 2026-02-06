import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Set to true if your DB supports/requires SSL and you have the certs
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
