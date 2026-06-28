import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

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
