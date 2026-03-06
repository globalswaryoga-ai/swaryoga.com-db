"use strict";
/**
 * User Service
 * -------------
 * Contains all business logic for User CRUD operations.
 * This layer sits between the controller (HTTP) and the data store (model).
 * All methods are async to mirror real-world DB interactions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = exports.createUser = void 0;
const uuid_1 = require("uuid");
const user_model_1 = require("../models/user.model");
// ---------------------------------------------------------------------------
// CREATE — Add a new user to the store
// ---------------------------------------------------------------------------
/**
 * Creates a new user, assigns a UUID and timestamp, and pushes it to the store.
 * @throws Error if a user with the same email already exists.
 */
const createUser = async (dto) => {
    // Check for duplicate email
    const duplicate = user_model_1.users.find((u) => u.email.toLowerCase() === dto.email.toLowerCase());
    if (duplicate) {
        throw new Error(`A user with email "${dto.email}" already exists.`);
    }
    const newUser = {
        id: (0, uuid_1.v4)(),
        name: dto.name,
        email: dto.email,
        createdAt: new Date().toISOString(),
    };
    user_model_1.users.push(newUser);
    return newUser;
};
exports.createUser = createUser;
// ---------------------------------------------------------------------------
// READ — Retrieve users
// ---------------------------------------------------------------------------
/** Returns every user in the store. */
const getAllUsers = async () => {
    return user_model_1.users;
};
exports.getAllUsers = getAllUsers;
/**
 * Finds a single user by their UUID.
 * @returns The user or undefined if not found.
 */
const getUserById = async (id) => {
    return user_model_1.users.find((u) => u.id === id);
};
exports.getUserById = getUserById;
// ---------------------------------------------------------------------------
// UPDATE — Modify an existing user
// ---------------------------------------------------------------------------
/**
 * Updates a user's name and/or email.
 * @throws Error if email is being changed to one that already exists.
 * @returns The updated user or undefined if the id doesn't exist.
 */
const updateUser = async (id, dto) => {
    const index = user_model_1.users.findIndex((u) => u.id === id);
    if (index === -1)
        return undefined;
    // If email is changing, ensure uniqueness
    if (dto.email) {
        const duplicate = user_model_1.users.find((u) => u.email.toLowerCase() === dto.email.toLowerCase() && u.id !== id);
        if (duplicate) {
            throw new Error(`A user with email "${dto.email}" already exists.`);
        }
    }
    // Merge updated fields into the existing user
    const existing = user_model_1.users[index];
    const updated = {
        ...existing,
        name: dto.name ?? existing.name,
        email: dto.email ?? existing.email,
    };
    user_model_1.users[index] = updated;
    return updated;
};
exports.updateUser = updateUser;
// ---------------------------------------------------------------------------
// DELETE — Remove a user from the store
// ---------------------------------------------------------------------------
/**
 * Deletes a user by id.
 * @returns true if deleted, false if not found.
 */
const deleteUser = async (id) => {
    const index = user_model_1.users.findIndex((u) => u.id === id);
    if (index === -1)
        return false;
    user_model_1.users.splice(index, 1);
    return true;
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=user.service.js.map