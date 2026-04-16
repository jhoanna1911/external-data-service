# Prueba Técnica — Backend Junior

API REST en Node.js + Express (TypeScript) que consume una API pública externa
([JSONPlaceholder](https://jsonplaceholder.typicode.com)), transforma los datos
y los expone por un endpoint propio. Incluye autenticación JWT, persistencia
con PostgreSQL + TypeORM y tests con Jest + Supertest.

## Qué hace

- Consulta la lista de posts de JSONPlaceholder.
- **Transforma** cada post: genera un `slug` a partir del título y un `summary`
  recortado del cuerpo. No devuelve los datos tal cual.
- Expone la respuesta por `GET /external-data` en JSON.
- Permite registrar/loguear usuarios (JWT) y persistir los posts transformados
  en Postgres para consultarlos luego.

## Stack

- Node.js 20 + TypeScript
- Express 5
- TypeORM 0.3 + PostgreSQL 15
- JWT (`jsonwebtoken`) + bcrypt
- Axios
- Jest + Supertest
- Docker / Docker Compose

## API externa usada

[JSONPlaceholder](https://jsonplaceholder.typicode.com) — endpoint `/posts`.
Se consume vía `axios` en [src/modules/external/external.service.ts](src/modules/external/external.service.ts).

## Estructura

```
src/
├── app.ts                     # Configuración de Express (middlewares, rutas)
├── server.ts                  # Bootstrap: inicializa DataSource y arranca el server
├── config/
│   └── data-source.ts         # Configuración de TypeORM
├── middlewares/
│   └── auth.middleware.ts     # Verificación del JWT
├── modules/
│   ├── auth/                  # Registro / login (controller · service · routes)
│   ├── user/                  # Entity User
│   └── external/              # Consumo API externa (controller · service · routes · entity Post)
└── tests/
    └── external.test.ts       # Tests con Jest + Supertest
```

Cada módulo sigue el patrón **controller → service → entity** con rutas propias.

## Cómo ejecutarlo localmente

### 1. Clonar e instalar

```bash
git clone https://github.com/jhoanna1911/external-data-service
cd prueba-tecnica-backend
npm install
cp .env.example .env
```

### 2. Levantar Postgres con Docker

```bash
docker compose up -d
```

Esto arranca Postgres 15 en `localhost:5433` con la BD `prueba_tecnica`
(puerto 5433 para no chocar con un Postgres local si lo hay).

### 3. Arrancar la API en modo desarrollo

```bash
npm run dev
```

Deberías ver:

```
Base de datos conectada
Servidor corriendo en http://localhost:3000
```

### 4. Build y ejecución en producción

```bash
npm run build
npm start
```

### 5. Tests

```bash
npm test
```

## Variables de entorno

Ver [.env.example](.env.example):

| Variable            | Descripción                                    |
|---------------------|------------------------------------------------|
| `PORT`              | Puerto de la API (default `3000`)              |
| `NODE_ENV`          | `development` / `production`                   |
| `DB_HOST`           | Host de Postgres                               |
| `DB_PORT`           | Puerto de Postgres (`5433` local con docker)   |
| `DB_USERNAME`       | Usuario                                        |
| `DB_PASSWORD`       | Contraseña                                     |
| `DB_NAME`           | Nombre de la base                              |
| `JWT_SECRET`        | Secreto para firmar tokens                     |
| `JWT_EXPIRES_IN`    | Expiración (ej. `1d`)                          |
| `EXTERNAL_API_URL`  | URL base de la API externa                     |

## Endpoints

| Método | Ruta                      | Auth  | Descripción                                               |
|--------|---------------------------|-------|-----------------------------------------------------------|
| GET    | `/`                       | —     | Health check + listado de endpoints                       |
| POST   | `/auth/register`          | —     | Crea un usuario (`email`, `password`, `name?`)            |
| POST   | `/auth/login`             | —     | Devuelve `{ token, user }`                                |
| GET    | `/external-data`          | —     | Consulta JSONPlaceholder, transforma y retorna            |
| POST   | `/external-data/sync`     | JWT   | Igual al anterior + guarda en Postgres                    |
| GET    | `/external-data/stored`   | JWT   | Lista los posts guardados en la BD                        |

### Ejemplo de respuesta — `GET /external-data`

```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "sunt aut facere repellat provident occaecati",
    "summary": "quia et suscipit suscipit recusandae consequuntur expedita et cum...",
    "slug": "sunt-aut-facere-repellat-provident-occaecati"
  }
]
```

### Flujo de autenticación

```bash
# 1) Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'

# 2) Login → devuelve token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# 3) Uso del token
curl -X POST http://localhost:3000/external-data/sync \
  -H "Authorization: Bearer <TOKEN>"
```

## Docker (app + BD)

Hay un [Dockerfile](Dockerfile) multi-stage para empaquetar la API.
Para correr la API en contenedor:

```bash
docker build -t prueba-tecnica-backend .
docker run --rm -p 3000:3000 --env-file .env prueba-tecnica-backend
```

## Despliegue en Azure

Ver [AZURE.md](AZURE.md) para la estrategia detallada (App Service,
variables de entorno, GitHub Actions y Blob Storage con SAS).
