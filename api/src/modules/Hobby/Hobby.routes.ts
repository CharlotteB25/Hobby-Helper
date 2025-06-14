import express from "express";
import * as hobbyController from "./Hobby.controller";
import { getHobbyById } from "./Hobby.controller";
import { authJwt } from "../../middleware/auth/authMiddleware";

const router = express.Router();

// ✅ More specific route FIRST
router.get("/suggestions", hobbyController.getSuggestedHobbies);

// ✅ Less specific route LAST
router.get("/:id", getHobbyById);
router.get("/", hobbyController.getAllHobbies);

export default router;
