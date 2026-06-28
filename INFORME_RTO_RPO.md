# Informe RTO / RPO — Clínica Médica

## Definiciones

- **RTO (Recovery Time Objective):** tiempo máximo que el sistema puede estar fuera de servicio
  antes de afectar seriamente a la organización. Mide *cuánto tardamos en volver a funcionar*.
- **RPO (Recovery Point Objective):** punto en el tiempo al que se puede volver tras un incidente,
  es decir, *cuántos datos podemos llegar a perder* entre la falla y el último respaldo válido.

## Aplicación al caso

La base `clinica_medica` guarda turnos, pacientes e historiales clínicos. La información más crítica
es la de **turnos** e **historiales médicos**, que cambia a diario; el resto (especialidades, médicos)
cambia con muy poca frecuencia.

| Parámetro | Valor propuesto | Justificación |
|---|---|---|
| **RTO** | 4 horas | La clínica puede operar con la agenda en papel un rato, pero no un día entero. Restaurar un `mongodump` reciente lleva minutos, así que 4 h da margen para detectar la falla y actuar. |
| **RPO** | 24 horas | Se acepta perder, como máximo, los cambios de un día. Un backup diario completo es suficiente y de bajo costo para el volumen de una clínica. |

## Estrategia de respaldo

- **Tipo:** backup completo (full) con `mongodump`. El volumen es chico, así que un full diario es
  simple y evita las dependencias de los backups incrementales.
- **Frecuencia:** una vez al día (cumple el RPO de 24 h).
- **Almacenamiento:** carpeta `resguardos_tpi/`, con una subcarpeta por fecha para identificar cuándo
  se hizo cada respaldo. En producción se copiaría además a almacenamiento en la nube.
- **Restauración:** con `mongorestore --drop`, eligiendo el backup deseado de la lista. Conviene
  validar la restauración periódicamente en un entorno de prueba.

## Conclusión

Con un backup completo diario y restauración mediante `mongorestore`, la clínica cumple un **RPO de 24 h**
y un **RTO de 4 h**, valores razonables para su criticidad y volumen de datos.
