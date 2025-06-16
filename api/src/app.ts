import express, { Express } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { registerMiddleware } from "./middleware";
import dotenv from "dotenv";
dotenv.config();

const app: Express = express();

// Define allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_DEV,
  process.env.FRONTEND_URL_PROD,
].filter(
  (origin): origin is string => typeof origin === "string" && origin.length > 0
);

// Middleware to set CORS headers

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins, // Only defined origins
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

// Use CORS middleware
app.use(cors(corsOptions));

// Register middleware
registerMiddleware(app);

// Register routes
registerRoutes(app);

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
