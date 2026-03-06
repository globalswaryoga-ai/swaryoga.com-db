/**
 * User Routes — Hardened
 * ------------------------
 * Maps HTTP methods + paths to validation middleware + controller handlers.
 *
 * Break-proof design:
 *   - Every route with :id validates UUID format BEFORE hitting the controller
 *   - Every POST/PUT validates & sanitizes the body BEFORE the controller
 *   - Invalid requests are rejected at the middleware layer — controllers stay thin
 *
 * Route summary:
 *   POST   /api/users      → validateCreateUser → createUser
 *   GET    /api/users      → getAllUsers
 *   GET    /api/users/:id  → validateIdParam → getUserById
 *   PUT    /api/users/:id  → validateIdParam + validateUpdateUser → updateUser
 *   DELETE /api/users/:id  → validateIdParam → deleteUser
 */

import { Router } from "express";
import * as userController from "../controllers/user.controller";
import {
  validateCreateUser,
  validateUpdateUser,
  validateIdParam,
} from "../middleware/validate";

const router = Router();

// Create a new user (body validated & sanitized)
router.post("/", validateCreateUser, userController.createUser);

// Get all users
router.get("/", userController.getAllUsers);

// Get a single user by id (UUID validated)
router.get("/:id", validateIdParam, userController.getUserById);

// Update an existing user (UUID + body validated)
router.put("/:id", validateIdParam, validateUpdateUser, userController.updateUser);

// Delete a user (UUID validated)
router.delete("/:id", validateIdParam, userController.deleteUser);

export default router;
