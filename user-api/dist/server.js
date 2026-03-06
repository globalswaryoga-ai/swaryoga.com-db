"use strict";
/**
 * Server Entry Point
 * -------------------
 * Bootstraps the Express application:
 *   1. Registers JSON body-parser middleware
 *   2. Mounts the user routes under /api/users
 *   3. Adds a health-check endpoint at GET /
 *   4. Starts listening on the configured port
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
// Create the Express app
const app = (0, express_1.default)();
// Port — use the PORT env variable or default to 3000
const PORT = process.env.PORT || 3000;
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// Parse incoming JSON request bodies
app.use(express_1.default.json());
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// Health-check / welcome route
app.get("/", (_req, res) => {
    res.json({
        message: "User API is running 🚀",
        endpoints: {
            "POST   /api/users": "Create a user",
            "GET    /api/users": "List all users",
            "GET    /api/users/:id": "Get user by id",
            "PUT    /api/users/:id": "Update user",
            "DELETE /api/users/:id": "Delete user",
        },
    });
});
// Mount user CRUD routes
app.use("/api/users", user_routes_1.default);
// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}`);
    console.log(`📚 API base path: http://localhost:${PORT}/api/users`);
});
//# sourceMappingURL=server.js.map