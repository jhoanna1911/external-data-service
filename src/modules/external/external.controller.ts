import { Request, Response } from "express";
import { ExternalService } from "./external.service";

export class ExternalController {
  private externalService = new ExternalService();

  getExternalData = async (_req: Request, res: Response) => {
    try {
      const data = await this.externalService.getTransformedPosts();
      return res.status(200).json(data);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error consultando API externa", error: error.message });
    }
  };

  syncPosts = async (_req: Request, res: Response) => {
    try {
      const data = await this.externalService.fetchAndSavePosts();
      return res
        .status(200)
        .json({ message: "Posts sincronizados", count: data.length, data });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error sincronizando", error: error.message });
    }
  };

  getStoredPosts = async (_req: Request, res: Response) => {
    try {
      const data = await this.externalService.getStoredPosts();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}