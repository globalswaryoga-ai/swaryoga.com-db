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
import { Request, Response } from "express";
export declare const createUser: (req: Request, res: Response) => Promise<void>;
export declare const getAllUsers: (_req: Request, res: Response) => Promise<void>;
export declare const getUserById: (req: Request, res: Response) => Promise<void>;
export declare const updateUser: (req: Request, res: Response) => Promise<void>;
export declare const deleteUser: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map