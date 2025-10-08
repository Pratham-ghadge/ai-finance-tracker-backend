// backend/config/database.js
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Create Neon client
const sql = neon(process.env.DATABASE_URL);

// Test connection function
export const testConnection = async () => {
  try {
    console.log('🔌 Testing Neon database connection...');
    const result = await sql`SELECT version()`;
    console.log('✅ Database connected successfully');
    console.log('📊 PostgreSQL version:', result[0].version);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

export default sql;