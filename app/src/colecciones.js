// Descriptores de las 5 colecciones de "clinica_medica".
// Derivados de Esquemas_Colecciones.md. Cada uno define:
//   nombre        -> nombre real de la colección en MongoDB
//   etiqueta      -> nombre para mostrar en el menú
//   mostrar(doc)  -> texto corto para listar / elegir un documento
//   campos[]      -> { clave, etiqueta, tipo, requerido, ...extra }
//   postProcesar  -> (opcional) enriquece el doc tras armarlo (ej: snapshot)
//
// Tipos de campo: string | date | hora | enum | ref | refMultiple | array
// Campos automáticos (no se piden): activo, fecha_creacion, fecha_modificacion.

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const especialidades = {
  nombre: 'especialidades',
  etiqueta: 'Especialidades',
  mostrar: (d) => `${d.nombre}`,
  campos: [
    { clave: 'nombre', etiqueta: 'Nombre', tipo: 'string', requerido: true },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'string', requerido: false },
  ],
};

export const pacientes = {
  nombre: 'pacientes',
  etiqueta: 'Pacientes',
  mostrar: (d) => `${d.apellido}, ${d.nombre} (DNI ${d.dni})`,
  campos: [
    { clave: 'nombre', etiqueta: 'Nombre', tipo: 'string', requerido: true },
    { clave: 'apellido', etiqueta: 'Apellido', tipo: 'string', requerido: true },
    { clave: 'dni', etiqueta: 'DNI', tipo: 'string', requerido: true },
    { clave: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'date', requerido: false },
    { clave: 'cobertura_medica', etiqueta: 'Cobertura médica', tipo: 'string', requerido: false },
    { clave: 'contacto.telefono', etiqueta: 'Teléfono', tipo: 'string', requerido: false },
    { clave: 'contacto.email', etiqueta: 'Email', tipo: 'string', requerido: false },
    { clave: 'contacto.direccion', etiqueta: 'Dirección', tipo: 'string', requerido: false },
  ],
};

export const medicos = {
  nombre: 'medicos',
  etiqueta: 'Médicos',
  mostrar: (d) => `${d.apellido}, ${d.nombre} (Mat. ${d.matricula})`,
  campos: [
    { clave: 'nombre', etiqueta: 'Nombre', tipo: 'string', requerido: true },
    { clave: 'apellido', etiqueta: 'Apellido', tipo: 'string', requerido: true },
    { clave: 'matricula', etiqueta: 'Matrícula', tipo: 'string', requerido: true },
    { clave: 'especialidad_ids', etiqueta: 'Especialidades', tipo: 'refMultiple', coleccion: 'especialidades', requerido: false },
    { clave: 'contacto.telefono', etiqueta: 'Teléfono', tipo: 'string', requerido: false },
    { clave: 'contacto.email', etiqueta: 'Email', tipo: 'string', requerido: false },
    {
      clave: 'horarios_atencion', etiqueta: 'Horarios de atención', tipo: 'array', requerido: false,
      subcampos: [
        { clave: 'dia', etiqueta: 'Día', tipo: 'enum', valores: DIAS, requerido: true },
        { clave: 'hora_inicio', etiqueta: 'Hora inicio', tipo: 'hora', requerido: true },
        { clave: 'hora_fin', etiqueta: 'Hora fin', tipo: 'hora', requerido: true },
      ],
    },
  ],
};

export const turnos = {
  nombre: 'turnos',
  etiqueta: 'Turnos',
  mostrar: (d) => {
    const fecha = d.fecha_turno ? new Date(d.fecha_turno).toISOString().slice(0, 10) : '?';
    return `${fecha} - ${d.snapshot_medico?.apellido ?? ''} - ${d.estado}`;
  },
  campos: [
    { clave: 'paciente_id', etiqueta: 'Paciente', tipo: 'ref', coleccion: 'pacientes', requerido: true },
    { clave: 'medico_id', etiqueta: 'Médico', tipo: 'ref', coleccion: 'medicos', requerido: true },
    { clave: 'fecha_turno', etiqueta: 'Fecha del turno', tipo: 'date', requerido: true },
    { clave: 'hora', etiqueta: 'Hora', tipo: 'hora', requerido: false },
    { clave: 'motivo_consulta', etiqueta: 'Motivo de consulta', tipo: 'string', requerido: false },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'enum', valores: ['pendiente', 'confirmado', 'realizado', 'cancelado'], requerido: true },
  ],
  // Arma snapshot_medico a partir del médico elegido (histórico, no se actualiza luego).
  postProcesar: async (doc, db) => {
    if (!doc.medico_id) return;
    const medico = await db.collection('medicos').findOne({ _id: doc.medico_id });
    if (!medico) return;
    let especialidad = '';
    const espId = medico.especialidad_ids?.[0];
    if (espId) {
      const esp = await db.collection('especialidades').findOne({ _id: espId });
      especialidad = esp?.nombre ?? '';
    }
    doc.snapshot_medico = { nombre: medico.nombre, apellido: medico.apellido, especialidad };
  },
};

export const historiales_medicos = {
  nombre: 'historiales_medicos',
  etiqueta: 'Historiales médicos',
  mostrar: (d) => {
    const fecha = d.fecha_consulta ? new Date(d.fecha_consulta).toISOString().slice(0, 10) : '?';
    return `${fecha} - ${d.diagnostico}`;
  },
  campos: [
    { clave: 'paciente_id', etiqueta: 'Paciente', tipo: 'ref', coleccion: 'pacientes', requerido: true },
    { clave: 'turno_id', etiqueta: 'Turno', tipo: 'ref', coleccion: 'turnos', requerido: false },
    { clave: 'fecha_consulta', etiqueta: 'Fecha de consulta', tipo: 'date', requerido: true },
    { clave: 'diagnostico', etiqueta: 'Diagnóstico', tipo: 'string', requerido: true },
    { clave: 'tratamiento', etiqueta: 'Tratamiento', tipo: 'string', requerido: false },
    {
      clave: 'medicamentos', etiqueta: 'Medicamentos', tipo: 'array', requerido: false,
      subcampos: [
        { clave: 'nombre', etiqueta: 'Nombre', tipo: 'string', requerido: true },
        { clave: 'dosis', etiqueta: 'Dosis', tipo: 'string', requerido: false },
        { clave: 'duracion', etiqueta: 'Duración', tipo: 'string', requerido: false },
      ],
    },
    { clave: 'proxima_consulta', etiqueta: 'Próxima consulta', tipo: 'date', requerido: false },
  ],
};

// Orden en que se muestran en el menú principal.
export const COLECCIONES = [especialidades, pacientes, medicos, turnos, historiales_medicos];
