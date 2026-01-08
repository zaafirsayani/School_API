// db.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

let client;
let db;

/**
 * Connect once and reuse the connection.
 * Call this before starting the server.
 */
export async function connectToDB() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();

  // If your URI includes /schooldb then this will be schooldb automatically.
  // If not, Mongo will still connect, but you should include /schooldb in the URI.
  db = client.db();

  console.log("Connected to MongoDB Atlas");
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call connectToDB() first.");
  }
  return db;
}

export async function closeDB() {
  if (client) await client.close();
}