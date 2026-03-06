/**
 * User Service
 * -------------
 * Contains all business logic for User CRUD operations.
 * This layer sits between the controller (HTTP) and the data store (model).
 * All methods are async to mirror real-world DB interactions.
 */
import { User, CreateUserDto, UpdateUserDto } from "../models/user.model";
/**
 * Creates a new user, assigns a UUID and timestamp, and pushes it to the store.
 * @throws Error if a user with the same email already exists.
 */
export declare const createUser: (dto: CreateUserDto) => Promise<User>;
/** Returns every user in the store. */
export declare const getAllUsers: () => Promise<User[]>;
/**
 * Finds a single user by their UUID.
 * @returns The user or undefined if not found.
 */
export declare const getUserById: (id: string) => Promise<User | undefined>;
/**
 * Updates a user's name and/or email.
 * @throws Error if email is being changed to one that already exists.
 * @returns The updated user or undefined if the id doesn't exist.
 */
export declare const updateUser: (id: string, dto: UpdateUserDto) => Promise<User | undefined>;
/**
 * Deletes a user by id.
 * @returns true if deleted, false if not found.
 */
export declare const deleteUser: (id: string) => Promise<boolean>;
//# sourceMappingURL=user.service.d.ts.map