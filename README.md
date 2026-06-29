# TPI Parte 2 — App de consola (Clínica Médica)

Aplicación de consola en Node.js que se conecta a MongoDB Atlas y permite:

- **ABM** (Alta, Baja lógica, Modificación y Listado) de la colección `especialidades` de `clinica_medica`.
- **Backup** y **Restore** de la colección `especialidades` con `mongodump` / `mongorestore`.

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

El menú opera sobre la colección `especialidades`:

- **1 Alta** · **2 Listar (activos)** · **3 Modificar** · **4 Baja (lógica)**.
- **5 Backup:** genera `resguardos_tpi/clinica_medica_<fecha>` con el dump de la colección `especialidades`.
- **6 Restore:** lista los backups guardados y restaura el que se elija (`--drop`).

> La lectura siempre filtra `activo: true`, respetando la baja lógica de la Parte 1.

## Backup por línea de comandos (script CLI)

Además del menú, está el script `backup.ps1` (Windows PowerShell) que cumple el Bloque 2 de la consigna.
Desde la carpeta `app/`:

```powershell
./backup.ps1
```

Crea `resguardos_tpi/clinica_medica_<fecha>` con el dump de la colección `especialidades`, usando rutas relativas y `mongodump` contra Atlas.

## Estructura

```
app/
  src/
    lib.js          # infraestructura: conexión a Atlas, helpers de consola,
                    #   CRUD genérico (Bloque 1) y backup/restore (Bloque 2)
    app.js          # ABM de especialidades y menú principal
  backup.ps1        # script CLI de backup
  .env / .env.example
```

> El código se organiza en dos módulos: `lib.js` reúne la conexión, los helpers
> de consola, el CRUD genérico y el backup/restore; y `app.js` implementa el ABM
> de `especialidades` y el menú.
