import { Express } from "express";
import { errorHandler } from "../middleware/error/errorHandlerMiddleware";
import userPublicRoutes from "../modules/User/User.public.routes";
import userPrivateRoutes from "../modules/User/User.private.routes";
import profileRoutes from "../modules/User/User.profile.routes";
import hobbyRoutes from "../modules/Hobby/Hobby.routes";
import userHobbyRoutes from "../modules/UserHobby/UserHobby.routes";
import { authJwt } from "../middleware/auth/authMiddleware";

const registerRoutes = (app: Express) => {
  // Public routes
  app.use("/api", userPublicRoutes);
  app.use("/api/hobbies", hobbyRoutes);

  // Private routes
  app.use("/api/users", authJwt, userPrivateRoutes);

  app.use("/api/users/profile", authJwt, profileRoutes);
  app.use("/api/user-hobbies", userHobbyRoutes);
  app.use("/api/userHobbies", userHobbyRoutes); // path must match frontend

  // Global error handler
  app.use(errorHandler);
};

export { registerRoutes };
