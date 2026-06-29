// App de consola - TPI Parte 2 (clinica_medica).
// Arma los formularios de Alta/Modificación recorriendo el descriptor de cada
// colección, y ofrece el menú de ABM + backup y restore.
import { COLECCIONES } from './colecciones.js';
import {
  connect, getDb, close,
  listarActivos, crear, actualizar, bajaLogica,
  crearBackup, restaurar,
  preguntar, confirmar, elegirDeLista, cerrar,
} from './lib.js';

// Mapa nombre -> descriptor, para resolver referencias.
const PORNOMBRE = Object.fromEntries(COLECCIONES.map((c) => [c.nombre, c]));

// Símbolos de control.
const OMITIR = Symbol('omitir');     // campo opcional dejado vacío
const MANTENER = Symbol('mantener'); // en edición: conservar valor actual
const CANCELAR = Symbol('cancelar'); // no se puede completar (ej: ref obligatoria sin opciones)

// --- Helpers de rutas con punto (ej: "contacto.telefono") ---
function setPath(obj, ruta, valor) {
  const partes = ruta.split('.');
  let actual = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    actual[partes[i]] ??= {};
    actual = actual[partes[i]];
  }
  actual[partes.at(-1)] = valor;
}
function getPath(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// --- Parseo de fechas y horas ---
function parseFecha(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00Z`);
  return isNaN(d) ? null : d;
}
function parseHora(str) {
  if (!/^\d{2}:\d{2}$/.test(str)) return null;
  const d = new Date(`1970-01-01T${str}:00Z`);
  return isNaN(d) ? null : d;
}
function mostrarFecha(v) {
  return v ? new Date(v).toISOString().slice(0, 10) : '';
}
function mostrarHora(v) {
  return v ? new Date(v).toISOString().slice(11, 16) : '';
}

// --- Pedido de un campo en modo ALTA ---
async function pedirCampoAlta(campo, db) {
  const { tipo, etiqueta, requerido } = campo;

  if (tipo === 'string') {
    while (true) {
      const r = await preguntar(`${etiqueta}: `);
      if (r) return r;
      if (!requerido) return OMITIR;
      console.log('  (obligatorio)');
    }
  }

  if (tipo === 'date') {
    while (true) {
      const r = await preguntar(`${etiqueta} (YYYY-MM-DD): `);
      if (!r) { if (!requerido) return OMITIR; console.log('  (obligatorio)'); continue; }
      const d = parseFecha(r);
      if (d) return d;
      console.log('  Formato inválido. Ej: 2026-06-28');
    }
  }

  if (tipo === 'hora') {
    while (true) {
      const r = await preguntar(`${etiqueta} (HH:mm): `);
      if (!r) { if (!requerido) return OMITIR; console.log('  (obligatorio)'); continue; }
      const d = parseHora(r);
      if (d) return d;
      console.log('  Formato inválido. Ej: 08:30');
    }
  }

  if (tipo === 'enum') {
    if (!requerido && !(await confirmar(`¿Cargar ${etiqueta}?`))) return OMITIR;
    while (true) {
      const i = await elegirDeLista(etiqueta, campo.valores.map((v) => ({ etiqueta: v })));
      if (i >= 0) return campo.valores[i];
      if (!requerido) return OMITIR;
    }
  }

  if (tipo === 'ref') {
    const desc = PORNOMBRE[campo.coleccion];
    const docs = await listarActivos(campo.coleccion);
    if (docs.length === 0) {
      console.log(`  No hay ${campo.coleccion} activos para asignar.`);
      return requerido ? CANCELAR : OMITIR;
    }
    if (!requerido && !(await confirmar(`¿Asignar ${etiqueta}?`))) return OMITIR;
    while (true) {
      const i = await elegirDeLista(etiqueta, docs.map((d) => ({ etiqueta: desc.mostrar(d) })));
      if (i >= 0) return docs[i]._id;
      if (!requerido) return OMITIR;
    }
  }

  if (tipo === 'refMultiple') {
    const desc = PORNOMBRE[campo.coleccion];
    const docs = await listarActivos(campo.coleccion);
    if (docs.length === 0) { console.log(`  No hay ${campo.coleccion} activos.`); return OMITIR; }
    const ids = [];
    do {
      const i = await elegirDeLista(etiqueta, docs.map((d) => ({ etiqueta: desc.mostrar(d) })));
      if (i >= 0 && !ids.some((id) => id.equals(docs[i]._id))) ids.push(docs[i]._id);
    } while (await confirmar(`¿Agregar otro ${etiqueta.toLowerCase()}?`));
    return ids.length ? ids : OMITIR;
  }

  if (tipo === 'array') {
    const items = [];
    if (await confirmar(`¿Cargar ${etiqueta}?`)) {
      do {
        const item = {};
        for (const sub of campo.subcampos) {
          const v = await pedirCampoAlta(sub, db);
          if (v !== OMITIR && v !== CANCELAR) item[sub.clave] = v;
        }
        items.push(item);
      } while (await confirmar(`¿Agregar otro ${etiqueta.toLowerCase()}?`));
    }
    return items.length ? items : OMITIR;
  }

  return OMITIR;
}

// Construye el documento completo para un ALTA. Devuelve null si se cancela.
async function armarDocumento(descriptor, db) {
  console.log(`\n--- Alta de ${descriptor.etiqueta} ---`);
  const doc = {};
  for (const campo of descriptor.campos) {
    const v = await pedirCampoAlta(campo, db);
    if (v === CANCELAR) { console.log('Alta cancelada.'); return null; }
    if (v !== OMITIR) setPath(doc, campo.clave, v);
  }
  if (descriptor.postProcesar) await descriptor.postProcesar(doc, db);
  return doc;
}

// --- Pedido de un campo en modo EDICIÓN (enter = mantener) ---
async function pedirCampoEditar(campo, actual) {
  const { tipo, etiqueta } = campo;
  const valActual = getPath(actual, campo.clave);

  if (tipo === 'string') {
    const r = await preguntar(`${etiqueta} [${valActual ?? ''}] (enter=mantener): `);
    return r ? r : MANTENER;
  }
  if (tipo === 'date') {
    const r = await preguntar(`${etiqueta} [${mostrarFecha(valActual)}] (YYYY-MM-DD, enter=mantener): `);
    if (!r) return MANTENER;
    const d = parseFecha(r);
    return d ?? MANTENER;
  }
  if (tipo === 'hora') {
    const r = await preguntar(`${etiqueta} [${mostrarHora(valActual)}] (HH:mm, enter=mantener): `);
    if (!r) return MANTENER;
    const d = parseHora(r);
    return d ?? MANTENER;
  }
  if (tipo === 'enum') {
    console.log(`${etiqueta} actual: ${valActual ?? '(sin valor)'}`);
    campo.valores.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));
    const r = await preguntar('Nuevo valor (número, enter=mantener): ');
    if (!r) return MANTENER;
    const n = Number(r);
    return Number.isInteger(n) && n >= 1 && n <= campo.valores.length ? campo.valores[n - 1] : MANTENER;
  }
  return MANTENER;
}

// Construye el objeto de cambios para una MODIFICACIÓN (claves con punto para $set).
// Las referencias y listas no se editan acá (se dan de baja y se vuelven a crear).
async function armarCambios(descriptor, actual) {
  console.log(`\n--- Modificar ${descriptor.etiqueta} ---`);
  const cambios = {};
  for (const campo of descriptor.campos) {
    if (['ref', 'refMultiple', 'array'].includes(campo.tipo)) continue;
    const v = await pedirCampoEditar(campo, actual);
    if (v !== MANTENER) cambios[campo.clave] = v;
  }
  return cambios;
}

// Elige un documento activo de una colección. Devuelve el doc o null.
async function elegirDocumento(descriptor) {
  const docs = await listarActivos(descriptor.nombre);
  const i = await elegirDeLista(descriptor.etiqueta, docs.map((d) => ({ etiqueta: descriptor.mostrar(d) })));
  return i >= 0 ? docs[i] : null;
}

// Submenú ABM de una colección.
async function gestionarColeccion(descriptor) {
  while (true) {
    console.log(`\n=== ${descriptor.etiqueta} ===`);
    console.log('  1. Alta');
    console.log('  2. Listar (activos)');
    console.log('  3. Modificar');
    console.log('  4. Baja (lógica)');
    console.log('  0. Volver');
    const op = await preguntar('Opción: ');

    try {
      if (op === '1') {
        const doc = await armarDocumento(descriptor, getDb());
        if (doc) {
          const id = await crear(descriptor.nombre, doc);
          console.log(`Creado con _id: ${id}`);
        }
      } else if (op === '2') {
        const docs = await listarActivos(descriptor.nombre);
        if (docs.length === 0) console.log('(Sin registros activos)');
        else docs.forEach((d, i) => console.log(`  ${i + 1}. ${descriptor.mostrar(d)}`));
      } else if (op === '3') {
        const doc = await elegirDocumento(descriptor);
        if (doc) {
          const cambios = await armarCambios(descriptor, doc);
          if (Object.keys(cambios).length === 0) console.log('Sin cambios.');
          else {
            await actualizar(descriptor.nombre, doc._id, cambios);
            console.log('Modificado.');
          }
        }
      } else if (op === '4') {
        const doc = await elegirDocumento(descriptor);
        if (doc && (await confirmar(`¿Dar de baja "${descriptor.mostrar(doc)}"?`))) {
          await bajaLogica(descriptor.nombre, doc._id);
          console.log('Dado de baja (baja lógica).');
        }
      } else if (op === '0') {
        return;
      } else {
        console.log('Opción inválida.');
      }
    } catch (err) {
      // Errores típicos: validación del $jsonSchema de la base.
      console.error(`Error: ${err.message}`);
    }
  }
}

// Menú principal.
async function menuPrincipal() {
  while (true) {
    console.log('\n========== CLÍNICA MÉDICA ==========');
    console.log('  1. Especialidades');
    console.log('  2. Pacientes');
    console.log('  3. Médicos');
    console.log('  4. Turnos');
    console.log('  5. Historiales médicos');
    console.log('  6. Backup');
    console.log('  7. Restore');
    console.log('  0. Salir');
    const op = await preguntar('Opción: ');

    if (op === '0') return;
    else if (op === '6') crearBackup();
    else if (op === '7') await restaurar();
    else {
      const idx = Number(op) - 1;
      if (idx >= 0 && idx < COLECCIONES.length) await gestionarColeccion(COLECCIONES[idx]);
      else console.log('Opción inválida.');
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
