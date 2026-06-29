// Infraestructura de la app: conexión a MongoDB, helpers de consola,
// CRUD genérico (Bloque 1) y backup/restore (Bloque 2).
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

// ============================================================
// Conexión
// ============================================================
const client = new MongoClient(URI);
let db = null;

// Abre la conexión con el clúster de Atlas (una sola vez).
export async function connect() {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Conectado a la base "${DB_NAME}"`);
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

// ============================================================
// Consola (entrada interactiva por teclado)
// ============================================================
const rl = createInterface({ input, output });

// Pregunta de texto libre.
export async function preguntar(mensaje) {
  const respuesta = await rl.question(mensaje);
  return respuesta.trim();
}

// Pregunta sí/no. Devuelve true si responde s/si.
export async function confirmar(mensaje) {
  const r = (await preguntar(`${mensaje} (s/n): `)).toLowerCase();
  return r === 's' || r === 'si' || r === 'sí';
}

// Muestra una lista de opciones y devuelve el índice elegido (o -1 si vacío/cancela).
// opciones: array de { etiqueta, valor }.
export async function elegirDeLista(titulo, opciones) {
  if (opciones.length === 0) {
    console.log(`(No hay ${titulo} disponibles)`);
    return -1;
  }
  console.log(`\n${titulo}:`);
  opciones.forEach((o, i) => console.log(`  ${i + 1}. ${o.etiqueta}`));
  const r = await preguntar('Elegí una opción (número): ');
  const n = Number(r);
  if (!Number.isInteger(n) || n < 1 || n > opciones.length) {
    console.log('Opción inválida.');
    return -1;
  }
  return n - 1;
}

// Cierra la interfaz de lectura.
export function cerrar() {
  rl.close();
}

// ============================================================
// CRUD genérico (CREATE, READ, UPDATE, DELETE lógico)
// ============================================================

// READ: trae solo documentos activos (respeta la baja lógica de la Parte 1).
export async function listarActivos(coleccion) {
  return getDb().collection(coleccion).find({ activo: true }).toArray();
}

// CREATE: inserta un documento nuevo agregando los campos automáticos.
export async function crear(coleccion, doc) {
  const ahora = new Date();
  const completo = {
    ...doc,
    activo: true,
    fecha_creacion: ahora,
    fecha_modificacion: ahora,
  };
  const res = await getDb().collection(coleccion).insertOne(completo);
  return res.insertedId;
}

// UPDATE: modifica campos específicos de un documento y actualiza la fecha.
export async function actualizar(coleccion, id, cambios) {
  const res = await getDb().collection(coleccion).updateOne(
    { _id: id },
    { $set: { ...cambios, fecha_modificacion: new Date() } }
  );
  return res.modifiedCount;
}

// DELETE (baja lógica): marca el documento como inactivo sin borrarlo físicamente.
export async function bajaLogica(coleccion, id) {
  const res = await getDb().collection(coleccion).updateOne(
    { _id: id },
    { $set: { activo: false, fecha_modificacion: new Date() } }
  );
  return res.modifiedCount;
}

// ============================================================
// Backup y restore (mongodump / mongorestore)
// Requiere las MongoDB Database Tools en el PATH.
// ============================================================
const DIR_RESGUARDOS = 'resguardos_tpi';        // ruta relativa, como pide la consigna
const COLECCION_BACKUP = 'especialidades';      // solo se resguarda esta colección

// Marca de tiempo para el nombre del backup: YYYY-MM-DD_HHmmss.
function marcaTiempo() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
}

// Ejecuta un comando externo mostrando su salida en pantalla.
function ejecutar(comando, args) {
  const r = spawnSync(comando, args, { stdio: 'inherit', shell: false });
  if (r.error) {
    console.error(`\nERROR: no se pudo ejecutar "${comando}". ¿Están instaladas las MongoDB Database Tools?`);
    return false;
  }
  return r.status === 0;
}

// CREATE backup: crea resguardos_tpi/<DB>_<fecha> con el dump de la colección especialidades.
export function crearBackup() {
  if (!existsSync(DIR_RESGUARDOS)) mkdirSync(DIR_RESGUARDOS, { recursive: true });
  const nombre = `${DB_NAME}_${marcaTiempo()}`;
  const destino = join(DIR_RESGUARDOS, nombre);
  console.log(`\nGenerando backup de "${COLECCION_BACKUP}" en "${destino}"...`);
  const ok = ejecutar('mongodump', ['--uri', URI, '--db', DB_NAME, '--collection', COLECCION_BACKUP, '--out', destino]);
  console.log(ok ? `Backup creado: ${nombre}` : 'El backup falló.');
}

// Lista las carpetas de backups existentes (más recientes primero).
export function listarBackups() {
  if (!existsSync(DIR_RESGUARDOS)) return [];
  return readdirSync(DIR_RESGUARDOS)
    .filter((n) => statSync(join(DIR_RESGUARDOS, n)).isDirectory())
    .sort()
    .reverse();
}

// RESTORE: muestra los backups, se elige uno y se restaura con --drop.
// El dump contiene solo la colección especialidades, así que únicamente se
// reemplaza esa colección.
export async function restaurar() {
  const backups = listarBackups();
  if (backups.length === 0) {
    console.log('\nNo hay backups guardados todavía.');
    return;
  }
  const i = await elegirDeLista('Backups disponibles', backups.map((b) => ({ etiqueta: b })));
  if (i < 0) return;
  const origen = join(DIR_RESGUARDOS, backups[i]);
  console.log(`\nRestaurando desde "${origen}" (se reemplaza el contenido actual)...`);
  const ok = ejecutar('mongorestore', ['--uri', URI, '--drop', origen]);
  console.log(ok ? 'Restore completado.' : 'El restore falló.');
}
