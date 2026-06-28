# Script CLI de resguardo - TPI Parte 2 (Bloque 2).
# Crea la carpeta resguardos_tpi con una subcarpeta con la fecha actual
# y ejecuta mongodump contra el cluster de Atlas. Usa rutas relativas.
#
# Requisitos: MongoDB Database Tools (mongodump) en el PATH.
# Ejecutar desde la carpeta "app":  ./backup.ps1

# --- Leer MONGODB_URI y DB_NAME desde el archivo .env ---
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}
$uri = $envVars["MONGODB_URI"]
$dbName = $envVars["DB_NAME"]

# --- Armar rutas relativas: resguardos_tpi/<DB>_<fecha> ---
$fecha = Get-Date -Format "yyyy-MM-dd"
$base = "resguardos_tpi"
$destino = Join-Path $base "$($dbName)_$fecha"

if (-not (Test-Path $base)) { New-Item -ItemType Directory -Path $base | Out-Null }

Write-Host "Generando backup en '$destino'..."

# --- mongodump remoto a Atlas ---
mongodump --uri "$uri" --db $dbName --out "$destino"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completado correctamente."
} else {
    Write-Host "El backup fallo (codigo $LASTEXITCODE)."
}
