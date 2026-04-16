import { Router } from "express";
import { ExternalController } from "./external.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const controller = new ExternalController();

router.get("/external-data", controller.getExternalData);
router.post("/external-data/sync", authMiddleware, controller.syncPosts);
router.get("/external-data/stored", authMiddleware, controller.getStoredPosts);

export default router;
