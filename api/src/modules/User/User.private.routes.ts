import express from "express";
import { authJwt } from "../../middleware/auth/authMiddleware";
import { getCurrentUser, updateUser } from "./User.controller";
import { wrapAuthedHandler } from "../../middleware/auth/wrapAuthedHandler"; // 👈 Add this import

const router = express.Router();

router.get("/", authJwt, wrapAuthedHandler(getCurrentUser)); // ✅ wrapped
router.patch("/", authJwt, wrapAuthedHandler(updateUser)); // ✅ wrapped

export default router;
