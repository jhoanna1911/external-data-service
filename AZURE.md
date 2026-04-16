# Despliegue en Azure

Estrategia para desplegar esta API en Azure cumpliendo los requisitos de la prueba.

## Arquitectura

```
       ┌────────────────────────┐        ┌─────────────────────────────┐
GitHub ─▶  GitHub Actions (CI)   ├──────▶ │ Azure App Service (Node 20) │
       │  - build + test         │        │  - variables de entorno     │
       └────────────────────────┘        │  - URL pública HTTPS         │
                                          └──────────────┬──────────────┘
                                                         │
                         ┌───────────────────────────────┼──────────────────────┐
                         ▼                                                       ▼
         ┌──────────────────────────────────┐         ┌──────────────────────────────────┐
         │ Azure DB for PostgreSQL Flexible │         │ Azure Storage Account (Blob)     │
         │  - TLS, firewall                 │         │  - Container privado             │
         │  - `prueba_tecnica` DB           │         │  - Acceso por SAS token firmado  │
         └──────────────────────────────────┘         └──────────────────────────────────┘
```

## 1. Recursos a crear

| Recurso                              | Propósito                                                           |
|--------------------------------------|---------------------------------------------------------------------|
| Resource Group `rg-prueba-tecnica`   | Agrupa todos los recursos                                           |
| App Service Plan (Linux, B1)         | Cómputo para la API                                                 |
| **Azure App Service** (Node 20 LTS)  | Runtime de la API. URL pública `https://<app>.azurewebsites.net`    |
| **Azure DB for PostgreSQL Flexible** | Base de datos gestionada                                            |
| **Azure Storage Account** + container| Carga/descarga de archivos vía SAS                                  |
| (Opcional) App Insights              | Observabilidad / logs                                               |

## 2. App Service — configuración

En el portal → **App Service → Configuration → Application settings** definir:

| Setting             | Valor                                                          |
|---------------------|----------------------------------------------------------------|
| `NODE_ENV`          | `production`                                                   |
| `PORT`              | `8080` (Azure inyecta `PORT`; Express ya lo usa)               |
| `DB_HOST`           | `<servidor>.postgres.database.azure.com`                       |
| `DB_PORT`           | `5432`                                                         |
| `DB_USERNAME`       | usuario administrador del flexible server                      |
| `DB_PASSWORD`       | **(secret)**                                                   |
| `DB_NAME`           | `prueba_tecnica`                                               |
| `JWT_SECRET`        | **(secret)** cadena aleatoria larga                            |
| `JWT_EXPIRES_IN`    | `1d`                                                           |
| `EXTERNAL_API_URL`  | `https://jsonplaceholder.typicode.com`                         |
| `AZURE_STORAGE_ACCOUNT` | nombre de la cuenta de storage                             |
| `AZURE_STORAGE_KEY` | **(secret)** access key                                        |
| `AZURE_STORAGE_CONTAINER` | nombre del container (ej. `uploads`)                     |

Para mayor seguridad, guardar los secretos en **Azure Key Vault** y referenciarlos
desde App Service con `@Microsoft.KeyVault(SecretUri=...)`.

### Startup command

App Service corre `npm start` por defecto, que ya apunta a `node dist/server.js`
según el [package.json](package.json). Asegúrate de que el build (`npm run build`)
se ejecute durante el deploy (el workflow de abajo lo hace).

## 3. Despliegue desde GitHub

### Opción A — Deployment Center (sin escribir YAML)

1. App Service → **Deployment Center** → Source: **GitHub**.
2. Autorizar, escoger `repo/branch = main`.
3. Build provider: **GitHub Actions** → Azure lo genera automáticamente.
4. Cada push a `main` despliega.

### Opción B — Workflow propio (recomendado)

Crear `.github/workflows/azure.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm prune --omit=dev

      - uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_APP_NAME }}
          publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: .
```

Secrets en GitHub:

- `AZURE_APP_NAME` — nombre del App Service.
- `AZURE_PUBLISH_PROFILE` — contenido del XML descargado desde
  *App Service → Get publish profile*.

## 4. Base de datos

1. Crear **Azure Database for PostgreSQL — Flexible Server**.
2. Firewall: permitir *Azure services*; para conexión desde local, añadir la IP
   propia temporalmente.
3. Crear la BD:
   ```sql
   CREATE DATABASE prueba_tecnica;
   ```
4. En producción, reemplazar `synchronize: true` por **migraciones TypeORM**
   (`typeorm migration:generate` / `migration:run`) para evitar cambios de
   esquema automáticos.

## 5. Storage + SAS para archivos

### 5.1. Recursos

- Crear **Storage Account** (`StorageV2`, LRS).
- Dentro, crear un **container** (por ejemplo `uploads`) con acceso **privado**.

### 5.2. Generar un SAS desde la API

Ejemplo de servicio para emitir URLs firmadas de subida (pattern recomendado:
el cliente sube directo a Blob Storage usando el SAS, sin pasar por la API):

```ts
// src/modules/storage/storage.service.ts
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

const account   = process.env.AZURE_STORAGE_ACCOUNT!;
const key       = process.env.AZURE_STORAGE_KEY!;
const container = process.env.AZURE_STORAGE_CONTAINER!;

const credential = new StorageSharedKeyCredential(account, key);
const service = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  credential
);

export class StorageService {
  /** SAS de escritura de 15 min para subir un blob. */
  getUploadSasUrl(blobName: string): string {
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        expiresOn,
        protocol: undefined,
      },
      credential
    ).toString();

    return `https://${account}.blob.core.windows.net/${container}/${blobName}?${sas}`;
  }

  /** SAS de lectura de 1 h para descargar un blob. */
  getDownloadSasUrl(blobName: string): string {
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn,
      },
      credential
    ).toString();

    return `https://${account}.blob.core.windows.net/${container}/${blobName}?${sas}`;
  }
}
```

Endpoint que consume el front:

```ts
// GET /files/upload-url?name=mi-archivo.png  (protegido con JWT)
router.get("/upload-url", authMiddleware, (req, res) => {
  const name = String(req.query.name);
  const url = new StorageService().getUploadSasUrl(name);
  res.json({ url });
});
```

Flujo:

1. El cliente pide `/files/upload-url?name=foto.png`.
2. La API devuelve una URL con SAS (válida 15 min, solo escritura).
3. El cliente hace `PUT` a esa URL con el archivo (ni bytes ni credenciales
   viajan por la API).
4. Para descargar, se emite otro SAS de solo lectura.

**Beneficios:**
- El access key nunca se expone al cliente.
- SAS con vida corta y permisos mínimos.
- Se puede revocar rotando la key o usando *stored access policies*.

## 6. Verificación del despliegue

1. Visitar `https://<app>.azurewebsites.net/` — debe devolver el health check.
2. `GET https://<app>.azurewebsites.net/external-data` — debe devolver los
   posts transformados.
3. Revisar logs en App Service → **Log stream**.

## 7. Mejoras sugeridas (producción real)

- Usar **Managed Identity** para que App Service acceda a Storage/Postgres sin
  compartir claves.
- Migraciones TypeORM en lugar de `synchronize: true`.
- **Azure Key Vault** para todos los secretos.
- **Application Insights** para trazas/errores.
- Reglas de firewall estrictas en Postgres (solo App Service VNet).
