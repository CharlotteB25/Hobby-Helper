import express from "express";
import { createUserHobby, getUserHobbies } from "./UserHobby.controller";
import { createUserHobbySchema } from "./UserHobby.validation";
import { zodValidator } from "../../validation/zodValidator";

const router = express.Router();

// POST: Add hobby for user (with validation!)
router.post("/", zodValidator(createUserHobbySchema), createUserHobby);

// GET: Get all hobbies for a user
router.get("/:userId", getUserHobbies);

export default router;
