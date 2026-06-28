// Backup y restore con las herramientas nativas mongodump / mongorestore.
// Implementa el Bloque 2 de la consigna. Requiere las MongoDB Database Tools en el PATH.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { elegirDeLista } from './prompts.js';

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const DIR_RESGUARDOS = 'resguardos_tpi'; // ruta relativa, como pide la consigna

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
    console.error(`\n✗ No se pudo ejecutar "${comando}". ¿Están instaladas las MongoDB Database Tools?`);
    return false;
  }
  return r.status === 0;
}

// CREATE backup: crea resguardos_tpi/<DB>_<fecha> con el dump de la base.
export function crearBackup() {
  if (!existsSync(DIR_RESGUARDOS)) mkdirSync(DIR_RESGUARDOS, { recursive: true });
  const nombre = `${DB_NAME}_${marcaTiempo()}`;
  const destino = join(DIR_RESGUARDOS, nombre);
  console.log(`\nGenerando backup en "${destino}"...`);
  const ok = ejecutar('mongodump', ['--uri', URI, '--db', DB_NAME, '--out', destino]);
  console.log(ok ? `✓ Backup creado: ${nombre}` : '✗ El backup falló.');
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
  console.log(ok ? '✓ Restore completado.' : '✗ El restore falló.');
}
