/**
 * User Service — Hardened
 * ------------------------
 * Contains all business logic for User CRUD operations.
 * This layer sits between the controller (HTTP) and the data store (model).
 *
 * Break-proof guarantees:
 *   - Uses typed AppError subclasses (no fragile string matching)
 *   - Store capped at MAX_USERS to prevent memory exhaustion
 *   - All methods are async to mirror real-world DB interactions
 *   - Input is assumed pre-validated by middleware (defense in depth)
 */

import { v4 as uuidv4 } from "uuid";
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  users,
  MAX_USERS,
} from "../models/user.model";
import {
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
} from "../errors/AppError";

// ---------------------------------------------------------------------------
// Helper — check for duplicate email (case-insensitive)
// ---------------------------------------------------------------------------

const findByEmail = (email: string, excludeId?: string): User | undefined =>
  users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      (excludeId ? u.id !== excludeId : true)
  );

// ---------------------------------------------------------------------------
// CREATE — Add a new user to the store
// ---------------------------------------------------------------------------

/**
 * Creates a new user, assigns a UUID and timestamp, and pushes it to the store.
 * @throws ConflictError if a user with the same email already exists.
 * @throws ServiceUnavailableError if the store is at capacity.
 */
export const createUser = async (dto: CreateUserDto): Promise<User> => {
  // Guard: store capacity
  if (users.length >= MAX_USERS) {
    throw new ServiceUnavailableError(
      `User store is full (max ${MAX_USERS}). Cannot create more users.`
    );
  }

  // Guard: duplicate email
  if (findByEmail(dto.email)) {
    throw new ConflictError(
      `A user with email "${dto.email}" already exists.`
    );
  }

  const newUser: User = {
    id: uuidv4(),
    name: dto.name,
    email: dto.email,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  return newUser;
};

// ---------------------------------------------------------------------------
// READ — Retrieve users
// ---------------------------------------------------------------------------

/** Returns all users in the store. */
export const getAllUsers = async (): Promise<User[]> => {
  return [...users]; // Return a copy so callers can't mutate the store
};

/**
 * Finds a single user by their UUID.
 * @throws NotFoundError if no user matches the given id.
 */
export const getUserById = async (id: string): Promise<User> => {
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new NotFoundError("User", id);
  }
  return user;
};

// ---------------------------------------------------------------------------
// UPDATE — Modify an existing user
// ---------------------------------------------------------------------------

/**
 * Updates a user's name and/or email.
 * @throws NotFoundError if the user id doesn't exist.
 * @throws ConflictError if the new email is already taken.
 */
export const updateUser = async (
  id: string,
  dto: UpdateUserDto
): Promise<User> => {
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new NotFoundError("User", id);
  }

  // If email is changing, ensure uniqueness
  if (dto.email && findByEmail(dto.email, id)) {
    throw new ConflictError(
      `A user with email "${dto.email}" already exists.`
    );
  }

  // Merge updated fields into the existing user (immutable update)
  const existing = users[index];
  const updated: User = {
    ...existing,
    name: dto.name ?? existing.name,
    email: dto.email ?? existing.email,
  };

  users[index] = updated;
  return updated;
};

// ---------------------------------------------------------------------------
// DELETE — Remove a user from the store
// ---------------------------------------------------------------------------

/**
 * Deletes a user by id.
 * @throws NotFoundError if the user id doesn't exist.
 */
export const deleteUser = async (id: string): Promise<void> => {
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new NotFoundError("User", id);
  }

  users.splice(index, 1);
};
