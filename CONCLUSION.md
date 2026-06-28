# Conclusión — Desafíos de la comunicación Cliente-Servidor

Al conectar la aplicación de consola con MongoDB Atlas aparecieron varios desafíos propios del
modelo cliente-servidor:

- **Conexión remota y credenciales:** el cliente (Node.js) se conecta a un servidor en la nube
  mediante un *connection string*. Hubo que separar las credenciales en un archivo `.env` para no
  exponerlas en el código y manejar la autenticación contra Atlas.

- **Operaciones asincrónicas:** toda comunicación con la base es por red, por lo que cada operación
  CRUD es asíncrona (`async/await`). El cliente debe esperar la respuesta del servidor antes de
  continuar, a diferencia de trabajar con datos en memoria.

- **El driver como traductor:** el driver nativo convierte los objetos JavaScript a **BSON** (y
  viceversa) para que el servidor los entienda. Entender esa traducción fue clave, sobre todo con
  tipos como `ObjectId` y `Date`, que no son strings comunes.

- **Validación del lado del servidor:** las reglas del `$jsonSchema` viven en la base, no en la app.
  Si un documento no cumple (campo requerido faltante, tipo incorrecto), el servidor rechaza la
  operación y el cliente debe capturar y mostrar ese error.

- **Baja lógica y consistencia:** la lectura debe filtrar siempre por `activo: true` para respetar la
  baja lógica. La coherencia de los datos depende de que el cliente aplique esa regla en cada consulta.

- **Backups con herramientas externas:** `mongodump`/`mongorestore` son procesos separados de la app.
  Coordinarlos desde el código (y depender de que estén instalados) muestra que la administración del
  servidor es una capa distinta del desarrollo de la aplicación.

En resumen, el trabajo dejó claro que la app no manipula los datos directamente, sino que **dialoga con
un servidor** a través del driver: enviando comandos, esperando respuestas y respetando las reglas que
el motor NoSQL impone.
