import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "../modules/user/user.entity";
import { Post } from "../modules/external/post.entity";

dotenv.config();

const dbHost = process.env.DB_HOST || "localhost";
const useSsl = dbHost !== "localhost";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: dbHost,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "prueba_tecnica",
  synchronize: true,
  logging: false,
  entities: [User, Post],
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});