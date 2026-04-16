import { Router } from "express";
import { ExternalController } from "./external.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const controller = new ExternalController();

// Público: consume la API externa, transforma y devuelve JSON
router.get("/external-data", controller.getExternalData);

// Protegidos con JWT: sincroniza/lee desde la BD
router.post("/external-data/sync", authMiddleware, controller.syncPosts);
router.get("/external-data/stored", authMiddleware, controller.getStoredPosts);

export default router;
