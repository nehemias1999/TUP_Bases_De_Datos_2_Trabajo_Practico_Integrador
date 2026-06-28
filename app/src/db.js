import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient(uri);
let db = null;

// Abre la conexión con el clúster de Atlas (una sola vez).
export async function connect() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`✓ Conectado a la base "${dbName}"`);
  }
  return db;
}

// Devuelve la base ya conectada.
export function getDb() {
  if (!db) throw new Error('La base no está conectada. Llamá a connect() primero.');
  return db;
}

// Cierra la conexión al salir de la app.
export async function close() {
  await client.close();
}
