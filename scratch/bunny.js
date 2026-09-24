"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBunnyDatabase = getBunnyDatabase;
exports.bunnyExecute = bunnyExecute;
exports.bunnyBatch = bunnyBatch;
exports.closeBunnyDatabase = closeBunnyDatabase;
exports.isBunnyDatabaseConfigured = isBunnyDatabaseConfigured;
exports.cleanMongoJson = cleanMongoJson;
var client_1 = require("@libsql/client");
/**
 * Server-side Bunny Database client.
 *
 * This is an application connection layer only. Existing routes continue to use
 * MongoDB until each module has a SQL schema, repository, and verified cutover.
 */
var client = null;
function getConfig() {
    var _a, _b;
    // Read environment variables when the client is created rather than at module
    // import time. Next.js dev workers can load this module before a refreshed
    // environment is visible, which otherwise leaves a stale empty configuration.
    var databaseUrl = (_a = process.env.BUNNY_DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim();
    var databaseToken = (_b = process.env.BUNNY_DATABASE_AUTH_TOKEN) === null || _b === void 0 ? void 0 : _b.trim();
    if (!databaseUrl || !databaseToken) {
        throw new Error('Bunny Database is not configured. Set BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN.');
    }
    return { url: databaseUrl, authToken: databaseToken };
}
/** Return the shared Bunny Database client, creating it lazily on first use. */
function getBunnyDatabase() {
    if (!client) {
        client = (0, client_1.createClient)(getConfig());
    }
    return client;
}
/** Execute a parameterized SQL statement against Bunny Database. */
function bunnyExecute(statement) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, getBunnyDatabase().execute(statement)];
        });
    });
}
/** Execute multiple statements atomically in a Bunny Database transaction. */
function bunnyBatch(statements) {
    return __awaiter(this, void 0, Promise, function () {
        return __generator(this, function (_a) {
            if (statements.length === 0)
                return [2 /*return*/, []];
            return [2 /*return*/, getBunnyDatabase().batch(statements, 'write')];
        });
    });
}
/**
 * Close the client during scripts/tests. Request handlers should not call this;
 * the client is intentionally reused for the lifetime of the server process.
 */
function closeBunnyDatabase() {
    if (client) {
        client.close();
        client = null;
    }
}
function isBunnyDatabaseConfigured() {
    var _a, _b;
    return Boolean(((_a = process.env.BUNNY_DATABASE_URL) === null || _a === void 0 ? void 0 : _a.trim()) &&
        ((_b = process.env.BUNNY_DATABASE_AUTH_TOKEN) === null || _b === void 0 ? void 0 : _b.trim()));
}
function cleanMongoJson(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(cleanMongoJson);
    }
    if (obj.$oid !== undefined)
        return obj.$oid;
    if (obj.$numberInt !== undefined)
        return Number(obj.$numberInt);
    if (obj.$numberLong !== undefined)
        return Number(obj.$numberLong);
    if (obj.$numberDouble !== undefined)
        return Number(obj.$numberDouble);
    if (obj.$numberDecimal !== undefined)
        return Number(obj.$numberDecimal);
    if (obj.$date !== undefined) {
        if (typeof obj.$date === 'object' && obj.$date.$numberLong) {
            return new Date(Number(obj.$date.$numberLong)).toISOString();
        }
        return obj.$date;
    }
    var cleaned = {};
    for (var key in obj) {
        cleaned[key] = cleanMongoJson(obj[key]);
    }
    return cleaned;
}
