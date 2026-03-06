"use strict";
/**
 * User Controller
 * ----------------
 * Handles HTTP request/response for User endpoints.
 * Each method:
 *   1. Extracts data from the request (params, body)
 *   2. Calls the appropriate service function
 *   3. Returns a JSON response with the correct status code
 *
 * Error handling is done with try/catch so unexpected errors
 * return a 500 instead of crashing the server.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = exports.createUser = void 0;
const userService = __importStar(require("../services/user.service"));
// ---------------------------------------------------------------------------
// POST /api/users — Create a new user
// ---------------------------------------------------------------------------
const createUser = async (req, res) => {
    try {
        const { name, email } = req.body;
        // Validate required fields
        if (!name || !email) {
            res.status(400).json({ error: "Both 'name' and 'email' are required." });
            return;
        }
        const user = await userService.createUser({ name, email });
        res.status(201).json(user);
    }
    catch (err) {
        // Duplicate-email errors are client mistakes → 409 Conflict
        if (err.message?.includes("already exists")) {
            res.status(409).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.createUser = createUser;
// ---------------------------------------------------------------------------
// GET /api/users — List all users
// ---------------------------------------------------------------------------
const getAllUsers = async (_req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    }
    catch {
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.getAllUsers = getAllUsers;
// ---------------------------------------------------------------------------
// GET /api/users/:id — Get a single user
// ---------------------------------------------------------------------------
const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            res.status(404).json({ error: `User with id "${req.params.id}" not found.` });
            return;
        }
        res.status(200).json(user);
    }
    catch {
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.getUserById = getUserById;
// ---------------------------------------------------------------------------
// PUT /api/users/:id — Update a user
// ---------------------------------------------------------------------------
const updateUser = async (req, res) => {
    try {
        const { name, email } = req.body;
        // At least one field must be provided
        if (!name && !email) {
            res.status(400).json({ error: "Provide at least 'name' or 'email' to update." });
            return;
        }
        const updated = await userService.updateUser(req.params.id, { name, email });
        if (!updated) {
            res.status(404).json({ error: `User with id "${req.params.id}" not found.` });
            return;
        }
        res.status(200).json(updated);
    }
    catch (err) {
        if (err.message?.includes("already exists")) {
            res.status(409).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.updateUser = updateUser;
// ---------------------------------------------------------------------------
// DELETE /api/users/:id — Delete a user
// ---------------------------------------------------------------------------
const deleteUser = async (req, res) => {
    try {
        const deleted = await userService.deleteUser(req.params.id);
        if (!deleted) {
            res.status(404).json({ error: `User with id "${req.params.id}" not found.` });
            return;
        }
        res.status(200).json({ message: "User deleted successfully." });
    }
    catch {
        res.status(500).json({ error: "Internal server error." });
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=user.controller.js.map