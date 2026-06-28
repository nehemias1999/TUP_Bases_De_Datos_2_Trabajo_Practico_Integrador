// App de consola - TPI Parte 2 (clinica_medica).
// Ofrece ABM de las 5 colecciones + backup y restore.
import { connect, getDb, close } from './db.js';
import { COLECCIONES } from './colecciones.js';
import { listarActivos, crear, actualizar, bajaLogica } from './crud.js';
import { armarDocumento, armarCambios } from './abm.js';
import { crearBackup, restaurar } from './backup.js';
import { preguntar, confirmar, elegirDeLista, cerrar } from './prompts.js';

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
          console.log(`✓ Creado con _id: ${id}`);
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
            console.log('✓ Modificado.');
          }
        }
      } else if (op === '4') {
        const doc = await elegirDocumento(descriptor);
        if (doc && (await confirmar(`¿Dar de baja "${descriptor.mostrar(doc)}"?`))) {
          await bajaLogica(descriptor.nombre, doc._id);
          console.log('✓ Dado de baja (baja lógica).');
        }
      } else if (op === '0') {
        return;
      } else {
        console.log('Opción inválida.');
      }
    } catch (err) {
      // Errores típicos: validación del $jsonSchema de la base.
      console.error(`✗ Error: ${err.message}`);
    }
  }
}

// Menú principal.
async function menuPrincipal() {
  while (true) {
    console.log('\n========== CLÍNICA MÉDICA ==========');
    COLECCIONES.forEach((c, i) => console.log(`  ${i + 1}. ${c.etiqueta}`));
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
