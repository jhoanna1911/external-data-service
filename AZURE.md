# Despliegue en Azure

## URL pública

```
https://external-data-service-jh-faamgqaheudje0h6.canadacentral-01.azurewebsites.net
```

## 1. Azure App Service

- Web App Linux, runtime **Node 20 LTS**, plan B1, región Canada Central.
- El comando de arranque es `npm start` (definido en [package.json](package.json)),
  que ejecuta `node dist/server.js`.
- Azure inyecta la variable `PORT`; Express la usa con `process.env.PORT`.

## 2. Variables de entorno

Definidas en **App Service → Settings → Environment variables → Application settings**:

| Setting                  | Valor                                                |
|--------------------------|------------------------------------------------------|
| `NODE_ENV`               | `production`                                         |
| `NPM_CONFIG_PRODUCTION`  | `false`                                              |
| `DB_HOST`                | host de Postgres                                     |
| `DB_PORT`                | `5432`                                               |
| `DB_USERNAME`            | usuario                                              |
| `DB_PASSWORD`            | *(secret)*                                           |
| `DB_NAME`                | nombre de la base                                    |
| `JWT_SECRET`             | *(secret)*                                           |
| `JWT_EXPIRES_IN`         | `1d`                                                 |
| `EXTERNAL_API_URL`       | `https://jsonplaceholder.typicode.com`               |

Los secretos pueden guardarse en **Azure Key Vault** y referenciarse desde
Application settings con `@Microsoft.KeyVault(SecretUri=...)`.

## 3. Despliegue desde GitHub

Configurado desde **App Service → Deployment Center**:

- Source: **GitHub**
- Repo / branch: `jhoanna1911/external-data-service` / `main`
- Build provider: **GitHub Actions**

Azure genera el workflow en `.github/workflows/` y añade el secret de
autenticación al repo. Cada push a `main` dispara build y deploy.

## 4. URL pública

La app queda accesible por HTTPS en la URL indicada arriba.
Probar:

```
GET  /                  → health check
GET  /external-data     → posts transformados
POST /auth/register     → crea usuario
POST /auth/login        → devuelve JWT
POST /external-data/sync  (JWT)
GET  /external-data/stored (JWT)
```

## 5. Carga de archivos a Azure Storage con SAS

**Pattern:** el cliente sube los archivos **directo** a Blob Storage usando
una URL firmada (SAS) emitida por la API. Los bytes no pasan por el App
Service y el access key nunca se expone al cliente.

### Recursos

- **Storage Account** (`StorageV2`, LRS).
- **Container** privado (ej. `uploads`).

### Variables adicionales

| Setting                      | Valor                          |
|------------------------------|--------------------------------|
| `AZURE_STORAGE_ACCOUNT`      | nombre de la cuenta            |
| `AZURE_STORAGE_KEY`          | *(secret)*                     |
| `AZURE_STORAGE_CONTAINER`    | `uploads`                      |

### Servicio

```ts
// src/modules/storage/storage.service.ts
import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

const account   = process.env.AZURE_STORAGE_ACCOUNT!;
const key       = process.env.AZURE_STORAGE_KEY!;
const container = process.env.AZURE_STORAGE_CONTAINER!;

const credential = new StorageSharedKeyCredential(account, key);

export class StorageService {
  getUploadSasUrl(blobName: string): string {
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("cw"),
        expiresOn,
      },
      credential
    ).toString();
    return `https://${account}.blob.core.windows.net/${container}/${blobName}?${sas}`;
  }

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

### Endpoint

```ts
// GET /files/upload-url?name=foto.png  (protegido con JWT)
router.get("/upload-url", authMiddleware, (req, res) => {
  const url = new StorageService().getUploadSasUrl(String(req.query.name));
  res.json({ url });
});
```

### Flujo

1. El cliente pide `/files/upload-url?name=foto.png`.
2. La API devuelve una URL SAS (15 min, solo escritura).
3. El cliente hace `PUT` a esa URL con el archivo.
4. Para descargar, la API emite un SAS de solo lectura (1 h).
