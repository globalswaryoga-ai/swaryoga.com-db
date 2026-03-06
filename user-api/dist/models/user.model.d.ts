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
/**
 * This array acts as our "database".
 * All CRUD operations read from and write to this array.
 * Data is lost when the server restarts.
 */
export declare const users: User[];
//# sourceMappingURL=user.model.d.ts.map