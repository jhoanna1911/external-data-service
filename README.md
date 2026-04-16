# External Data Service

## Qué hace

API REST en Node.js + Express (TypeScript) que consume la API pública
[JSONPlaceholder](https://jsonplaceholder.typicode.com), transforma cada
post (genera `slug` a partir del título y `summary` recortado del cuerpo)
y lo expone por `GET /external-data`.

Incluye autenticación JWT y persistencia opcional de los posts
transformados en PostgreSQL (TypeORM).

## API externa usada

[JSONPlaceholder](https://jsonplaceholder.typicode.com) — endpoint `/posts`.
Se consume con `axios` en [src/modules/external/external.service.ts](src/modules/external/external.service.ts).

## Cómo ejecutarlo localmente

```bash
git clone https://github.com/jhoanna1911/external-data-service
cd external-data-service
npm install
cp .env.example .env

docker compose up -d     # Postgres en localhost:5433
npm run dev              # API en http://localhost:3000
```

Tests:

```bash
npm test
```

## Endpoints

| Método | Ruta                      | Auth | Descripción                                    |
|--------|---------------------------|------|------------------------------------------------|
| GET    | `/`                       | —    | Health check                                   |
| POST   | `/auth/register`          | —    | Registro (`email`, `password`, `name?`)        |
| POST   | `/auth/login`             | —    | Devuelve `{ token, user }`                     |
| GET    | `/external-data`          | —    | Consume JSONPlaceholder, transforma y retorna  |
| POST   | `/external-data/sync`     | JWT  | Igual al anterior + guarda en Postgres         |
| GET    | `/external-data/stored`   | JWT  | Lista los posts guardados                      |

## Variables de entorno

Ver [.env.example](.env.example).

## Despliegue

Ver [AZURE.md](AZURE.md).

URL pública:
`https://external-data-service-jh-faamgqaheudje0h6.canadacentral-01.azurewebsites.net`

Colección de Postman: [postman/external-data-service.postman_collection.json](postman/external-data-service.postman_collection.json).
