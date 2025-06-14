// src/modules/User/User.routes.ts
import { Router } from "express";
import { authLocal } from "../../middleware/auth/authMiddleware";
import { login, register } from "./User.controller";
import { wrapAuthedHandler } from "../../middleware/auth/wrapAuthedHandler"; // 👈 import

const router = Router();

router.post("/login", authLocal, wrapAuthedHandler(login));
router.post("/register", wrapAuthedHandler(register)); // 👈 works without auth too

export default router;
