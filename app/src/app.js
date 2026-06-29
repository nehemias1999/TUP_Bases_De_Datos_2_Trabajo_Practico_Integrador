// App de consola - TPI Parte 2 (clinica_medica).
// ABM (Alta / Listar / Modificar / Baja lógica) de la colección "especialidades",
// más backup y restore de esa colección.
import {
  connect, close,
  listarActivos, crear, actualizar, bajaLogica,
  crearBackup, restaurar,
  preguntar, confirmar, elegirDeLista, cerrar,
} from './lib.js';

const COLECCION = 'especialidades';

// Texto corto para listar / elegir una especialidad.
const mostrar = (d) => d.nombre;

// ALTA: nombre (obligatorio) y descripción (opcional).
async function alta() {
  console.log('\n--- Alta de Especialidad ---');
  let nombre = '';
  while (!nombre) {
    nombre = await preguntar('Nombre: ');
    if (!nombre) console.log('  (obligatorio)');
  }
  const descripcion = await preguntar('Descripción (opcional): ');
  const doc = { nombre };
  if (descripcion) doc.descripcion = descripcion;
  const id = await crear(COLECCION, doc);
  console.log(`Creado con _id: ${id}`);
}

// Listar activos (respeta la baja lógica de la Parte 1).
async function listar() {
  const docs = await listarActivos(COLECCION);
  if (docs.length === 0) console.log('(Sin registros activos)');
  else docs.forEach((d, i) => console.log(`  ${i + 1}. ${mostrar(d)}`));
}

// Elige una especialidad activa. Devuelve el doc o null.
async function elegir() {
  const docs = await listarActivos(COLECCION);
  const i = await elegirDeLista('Especialidades', docs.map((d) => ({ etiqueta: mostrar(d) })));
  return i >= 0 ? docs[i] : null;
}

// MODIFICAR: enter mantiene el valor actual.
async function modificar() {
  const doc = await elegir();
  if (!doc) return;
  console.log('\n--- Modificar Especialidad ---');
  const cambios = {};
  const nombre = await preguntar(`Nombre [${doc.nombre ?? ''}] (enter=mantener): `);
  if (nombre) cambios.nombre = nombre;
  const descripcion = await preguntar(`Descripción [${doc.descripcion ?? ''}] (enter=mantener): `);
  if (descripcion) cambios.descripcion = descripcion;

  if (Object.keys(cambios).length === 0) { console.log('Sin cambios.'); return; }
  await actualizar(COLECCION, doc._id, cambios);
  console.log('Modificado.');
}

// BAJA lógica.
async function baja() {
  const doc = await elegir();
  if (doc && (await confirmar(`¿Dar de baja "${mostrar(doc)}"?`))) {
    await bajaLogica(COLECCION, doc._id);
    console.log('Dado de baja (baja lógica).');
  }
}

// Menú principal (una sola colección: especialidades).
async function menuPrincipal() {
  while (true) {
    console.log('\n========== ESPECIALIDADES ==========');
    console.log('  1. Alta');
    console.log('  2. Listar (activos)');
    console.log('  3. Modificar');
    console.log('  4. Baja (lógica)');
    console.log('  5. Backup');
    console.log('  6. Restore');
    console.log('  0. Salir');
    const op = await preguntar('Opción: ');

    try {
      if (op === '1') await alta();
      else if (op === '2') await listar();
      else if (op === '3') await modificar();
      else if (op === '4') await baja();
      else if (op === '5') crearBackup();
      else if (op === '6') await restaurar();
      else if (op === '0') return;
      else console.log('Opción inválida.');
    } catch (err) {
      // Errores típicos: validación del $jsonSchema de la base.
      console.error(`Error: ${err.message}`);
    }
  }
}

async function main() {
  try {
    await connect();
    await menuPrincipal();
  } catch (err) {
    console.error(`Error fatal: ${err.message}`);
  } finally {
    await close();
    cerrar();
    console.log('\n¡Hasta luego!');
  }
}

main();
