// Arma los formularios de Alta y Modificación recorriendo el descriptor de cada colección.
import { preguntar, confirmar, elegirDeLista } from './prompts.js';
import { listarActivos } from './crud.js';
import { COLECCIONES } from './colecciones.js';

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
export async function armarDocumento(descriptor, db) {
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
export async function armarCambios(descriptor, actual) {
  console.log(`\n--- Modificar ${descriptor.etiqueta} ---`);
  const cambios = {};
  for (const campo of descriptor.campos) {
    if (['ref', 'refMultiple', 'array'].includes(campo.tipo)) continue;
    const v = await pedirCampoEditar(campo, actual);
    if (v !== MANTENER) cambios[campo.clave] = v;
  }
  return cambios;
}
