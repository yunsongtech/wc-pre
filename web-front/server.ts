import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const API_BACKEND_URL = process.env.API_BACKEND_URL ?? "http://localhost:8080";

app.use(
  "/api",
  createProxyMiddleware({
    target: API_BACKEND_URL,
    changeOrigin: true,
  })
);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static bundle from 'dist' directory.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend dev server on http://localhost:${PORT} -> API ${API_BACKEND_URL}`);
  });
}

startServer();
