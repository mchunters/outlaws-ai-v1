import { MongoClient } from 'mongodb';
let client, db;
export async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'outlaws_ai');
  await db.collection('guild_settings').createIndex({guildId:1},{unique:true});
  await db.collection('conversations').createIndex({key:1},{unique:true});
  console.log('MongoDB connected');
}
export const settingsCollection = () => db.collection('guild_settings');
export const conversationsCollection = () => db.collection('conversations');
export async function closeDatabase() { if (client) await client.close(); }
