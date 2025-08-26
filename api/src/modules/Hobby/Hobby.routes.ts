import express from "express";
import * as hobbyController from "./Hobby.controller";
import { getHobbyById } from "./Hobby.controller";
import { authJwt } from "../../middleware/auth/authMiddleware";
import { wrapAuthedHandler } from "../../middleware/auth/wrapAuthedHandler";
import { zodValidator } from "../../validation/zodValidator";
import { createCustomHobbySchema } from "./Hobby.validation";

const router = express.Router();

// ✅ More specific routes FIRST
router.get("/suggestions", hobbyController.getSuggestedHobbies);

// ✅ NEW: mood/text/tag search
router.get("/search", hobbyController.searchHobbies);

// ✅ NEW: my custom hobbies
router.get(
  "/mine",
  authJwt,
  wrapAuthedHandler(hobbyController.getMyCustomHobbies)
);

// ✅ NEW: create custom hobby (auth + validation)
router.post(
  "/",
  authJwt,
  zodValidator(createCustomHobbySchema),
  wrapAuthedHandler(hobbyController.createCustomHobby)
);

// ✅ NEW: update/delete custom hobby (owner-only)
router.patch(
  "/:id",
  authJwt,
  wrapAuthedHandler(hobbyController.updateCustomHobby)
);
router.delete(
  "/:id",
  authJwt,
  wrapAuthedHandler(hobbyController.deleteCustomHobby)
);

// ✅ Less specific routes LAST
router.get("/:id", getHobbyById);
router.get("/", hobbyController.getAllHobbies);

export default router;
