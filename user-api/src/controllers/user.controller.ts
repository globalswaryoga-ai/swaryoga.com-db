/**
 * User Controller — Hardened
 * ---------------------------
 * Handles HTTP request/response for User endpoints.
 *
 * Break-proof design:
 *   - NO try/catch here — errors propagate to the global error handler
 *   - NO manual validation — handled by validation middleware in routes
 *   - NO string matching on error messages — service throws typed errors
 *   - Controller is thin: extract data → call service → send response
 *
 * This means adding new error types or changing messages NEVER breaks
 * the controller layer.
 */

import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";

// ---------------------------------------------------------------------------
// POST /api/users — Create a new user
// ---------------------------------------------------------------------------

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Body is already validated & sanitized by middleware
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err); // → global error handler
  }
};

// ---------------------------------------------------------------------------
// GET /api/users — List all users
// ---------------------------------------------------------------------------

export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/users/:id — Get a single user
// ---------------------------------------------------------------------------

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // :id already validated as UUID by middleware
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/users/:id — Update a user
// ---------------------------------------------------------------------------

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // :id validated, body validated & sanitized by middleware
    const updated = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/users/:id — Delete a user
// ---------------------------------------------------------------------------

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ message: "User deleted successfully." });
  } catch (err) {
    next(err);
  }
};
