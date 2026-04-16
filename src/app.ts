import "reflect-metadata";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import externalRoutes from "./modules/external/external.routes";

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "API Prueba Técnica funcionando ✅",
    endpoints: {
      health: "GET /",
      register: "POST /auth/register",
      login: "POST /auth/login",
      externalData: "GET /external-data",
      syncPosts: "POST /external-data/sync (requiere JWT)",
      storedPosts: "GET /external-data/stored (requiere JWT)",
    },
  });
});

app.use("/auth", authRoutes);
app.use("/", externalRoutes);

export default app;