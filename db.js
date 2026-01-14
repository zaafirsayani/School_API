import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

export async function connectToDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    db = client.db('School-api');
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    console.log("bad")
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  //console.log("Good")
  //console.log(db)
  return db;
}

export async function closeDatabase() {
  try {
    await client.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Failed to close MongoDB connection:', error);
    throw error;
  }
}
