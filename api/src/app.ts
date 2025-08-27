import express, { Express } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { registerMiddleware } from "./middleware";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/error/errorHandlerMiddleware"; // Adjust the path as needed
dotenv.config();

const app: Express = express();

// ✅ Parse JSON early (BEFORE any routes)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_DEV,
  process.env.FRONTEND_URL_PROD,
].filter(
  (origin): origin is string => typeof origin === "string" && origin.length > 0
);

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : true, // allow if empty (Insomnia won’t care)
  credentials: true,
};
app.use(cors(corsOptions));

// (optional) tiny health route for Render
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Register middleware (keep if you need it for auth, logs, etc.)
registerMiddleware(app);

// Routes
registerRoutes(app);
// ✅ GLOBAL ERROR HANDLER — must be BEFORE 404
app.use(errorHandler);

// 404
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

export default app;
