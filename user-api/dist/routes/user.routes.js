"use strict";
/**
 * User Routes
 * ------------
 * Maps HTTP methods + paths to their controller handlers.
 *
 * Route summary:
 *   POST   /api/users      → Create user
 *   GET    /api/users      → List all users
 *   GET    /api/users/:id  → Get user by id
 *   PUT    /api/users/:id  → Update user
 *   DELETE /api/users/:id  → Delete user
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
const express_1 = require("express");
const userController = __importStar(require("../controllers/user.controller"));
const router = (0, express_1.Router)();
// Create a new user
router.post("/", userController.createUser);
// Get all users
router.get("/", userController.getAllUsers);
// Get a single user by id
router.get("/:id", userController.getUserById);
// Update an existing user
router.put("/:id", userController.updateUser);
// Delete a user
router.delete("/:id", userController.deleteUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map