"use strict";
/**
 * User Model
 * -----------
 * Defines the shape of a User object and the in-memory data store.
 * Using a simple array as the "database" so no external DB is needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------
/**
 * This array acts as our "database".
 * All CRUD operations read from and write to this array.
 * Data is lost when the server restarts.
 */
exports.users = [];
//# sourceMappingURL=user.model.js.map