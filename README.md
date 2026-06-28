# TPI Parte 2 — App de consola (Clínica Médica)

Aplicación de consola en Node.js que se conecta a MongoDB Atlas y permite:

- **ABM** (Alta, Baja lógica, Modificación y Listado) de las 5 colecciones de `clinica_medica`.
- **Backup** y **Restore** de la base con `mongodump` / `mongorestore`.

## Requisitos

- **Node.js** 18 o superior.
- **MongoDB Database Tools** (provee `mongodump` y `mongorestore`) en el PATH.
  Descarga: https://www.mongodb.com/try/download/database-tools

## Instalación

Desde la carpeta `app/`:

```bash
npm install
```

## Configuración

Las credenciales de Atlas van en el archivo `.env` (ya incluido). Para usar otro clúster, copiar
`.env.example` a `.env` y completar:

```
MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@cluster0.xxxxx.mongodb.net/
DB_NAME=clinica_medica
```

## Ejecución

```bash
npm start
```

o bien:

```bash
node src/app.js
```

### Menú

- **1 a 5:** colecciones (`especialidades`, `pacientes`, `medicos`, `turnos`, `historiales_medicos`).
  Cada una abre el submenú: Alta · Listar activos · Modificar · Baja lógica.
- **6 Backup:** genera `resguardos_tpi/clinica_medica_<fecha>` con el dump de la base.
- **7 Restore:** lista los backups guardados y restaura el que se elija (`--drop`).

> La lectura siempre filtra `activo: true`, respetando la baja lógica de la Parte 1.

## Backup por línea de comandos (script CLI)

Además del menú, está el script `backup.ps1` (Windows PowerShell) que cumple el Bloque 2 de la consigna.
Desde la carpeta `app/`:

```powershell
./backup.ps1
```

Crea `resguardos_tpi/clinica_medica_<fecha>` usando rutas relativas y `mongodump` contra Atlas.

## Estructura

```
app/
  src/
    db.js           # conexión a Atlas
    prompts.js      # helpers de consola
    colecciones.js  # estructura de las 5 colecciones
    crud.js         # CRUD genérico (CREATE / READ / UPDATE / baja lógica)
    abm.js          # formularios de alta y modificación
    backup.js       # backup y restore
    app.js          # menú principal
  backup.ps1        # script CLI de backup
  .env / .env.example
  INFORME_RTO_RPO.md
  CONCLUSION.md
```
