// src/modules/User/User.profile.routes.ts
import express from "express";
import { authJwt } from "../../middleware/auth/authMiddleware";
import { getCurrentUser, updateUser } from "./User.controller";
import { wrapAuthedHandler } from "../../middleware/auth/wrapAuthedHandler"; // Adjust path as needed

const router = express.Router();

router.get("/", authJwt, wrapAuthedHandler(getCurrentUser));
router.patch("/", authJwt, wrapAuthedHandler(updateUser));

export default router;
