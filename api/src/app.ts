import express, { Express } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { registerMiddleware } from "./middleware";

const app: Express = express();

// Define allowed origins
const allowedOrigins = [
  "http://localhost:8081", // ✅ your frontend during development
  "http://localhost:3002",
  "http://192.168.0.211:3002",
];

// Middleware to set CORS headers

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins, // Allow all origins (for development purposes)
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
