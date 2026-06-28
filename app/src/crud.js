// CRUD genérico sobre cualquier colección, usando el driver nativo de MongoDB.
// Implementa el Bloque 1 de la consigna (CREATE, READ, UPDATE, DELETE lógico).
import { getDb } from './db.js';

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
