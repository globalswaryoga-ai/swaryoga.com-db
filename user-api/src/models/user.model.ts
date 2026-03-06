/**
 * User Model
 * -----------
 * Defines the shape of a User object and the in-memory data store.
 * Using a simple array as the "database" so no external DB is needed.
 */

/**
 * Interface representing a User entity.
 * - id:        Unique identifier (UUID v4)
 * - name:      Full name of the user
 * - email:     Email address (must be unique)
 * - createdAt: ISO-8601 timestamp of when the user was created
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * DTO for creating a new user.
 * The client only needs to supply name and email;
 * id and createdAt are generated server-side.
 */
export interface CreateUserDto {
  name: string;
  email: string;
}

/**
 * DTO for updating an existing user.
 * Both fields are optional — the client can update one or both.
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

/**
 * Maximum number of users the store can hold.
 * Prevents unbounded memory growth — a real DB would handle this,
 * but for in-memory storage we MUST cap it ourselves.
 */
export const MAX_USERS = 10_000;

/**
 * This array acts as our "database".
 * All CRUD operations read from and write to this array.
 * Data is lost when the server restarts.
 * Capped at MAX_USERS to prevent memory exhaustion.
 */
export const users: User[] = [];
