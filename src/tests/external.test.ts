import request from "supertest";

jest.mock("axios");

jest.mock("../config/data-source", () => ({
  AppDataSource: {
    getRepository: () => ({
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v: any) => v),
      clear: jest.fn(),
      findOne: jest.fn(),
    }),
  },
}));

import axios from "axios";
import app from "../app";

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GET /external-data", () => {
  it("responde 200 y transforma los datos de JSONPlaceholder", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          userId: 1,
          id: 1,
          title: "Hola Mundo",
          body: "contenido de prueba",
        },
      ],
    });

    const res = await request(app).get("/external-data");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toEqual({
      id: 1,
      userId: 1,
      title: "Hola Mundo",
      summary: "contenido de prueba",
      slug: "hola-mundo",
    });
  });

  it("devuelve 500 si la API externa falla", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("network down"));

    const res = await request(app).get("/external-data");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message");
  });
});

describe("GET /", () => {
  it("responde con el health check", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("endpoints");
  });
});

describe("Endpoints protegidos", () => {
  it("GET /external-data/stored sin token → 401", async () => {
    const res = await request(app).get("/external-data/stored");
    expect(res.status).toBe(401);
  });

  it("POST /external-data/sync sin token → 401", async () => {
    const res = await request(app).post("/external-data/sync");
    expect(res.status).toBe(401);
  });
});
