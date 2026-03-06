# User API — Node.js + Express + TypeScript

A simple CRUD REST API for managing users, built with Express and TypeScript using in-memory storage.

## Folder Structure

```
user-api/
├── src/
│   ├── controllers/
│   │   └── user.controller.ts   # HTTP request/response handling
│   ├── models/
│   │   └── user.model.ts        # User interface & in-memory store
│   ├── routes/
│   │   └── user.routes.ts       # Route definitions
│   ├── services/
│   │   └── user.service.ts      # Business logic (CRUD)
│   └── server.ts                # App entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
cd user-api
npm install
```

### 2. Run in development mode (with ts-node)

```bash
npm run dev
```

### 3. Or build and run the compiled JS

```bash
npm run build
npm start
```

The server starts at **http://localhost:3000** by default.  
Set the `PORT` env variable to change it: `PORT=4000 npm run dev`

---

## API Endpoints

| Method   | Path              | Description       |
|----------|-------------------|--------------------|
| `POST`   | `/api/users`      | Create a user      |
| `GET`    | `/api/users`      | List all users     |
| `GET`    | `/api/users/:id`  | Get user by id     |
| `PUT`    | `/api/users/:id`  | Update a user      |
| `DELETE` | `/api/users/:id`  | Delete a user      |

---

## Example Requests & Responses

### 1. Create a user

**Request**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "email": "alice@example.com"}'
```

**Response** `201 Created`
```json
{
  "id": "c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "createdAt": "2026-03-06T10:30:00.000Z"
}
```

### 2. Get all users

**Request**
```bash
curl http://localhost:3000/api/users
```

**Response** `200 OK`
```json
[
  {
    "id": "c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "createdAt": "2026-03-06T10:30:00.000Z"
  }
]
```

### 3. Get user by id

**Request**
```bash
curl http://localhost:3000/api/users/c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f
```

**Response** `200 OK`
```json
{
  "id": "c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "createdAt": "2026-03-06T10:30:00.000Z"
}
```

**Not found** `404`
```json
{
  "error": "User with id \"nonexistent-id\" not found."
}
```

### 4. Update a user

**Request**
```bash
curl -X PUT http://localhost:3000/api/users/c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith"}'
```

**Response** `200 OK`
```json
{
  "id": "c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "createdAt": "2026-03-06T10:30:00.000Z"
}
```

### 5. Delete a user

**Request**
```bash
curl -X DELETE http://localhost:3000/api/users/c0a1f7e4-3b2a-4d5c-9e8f-1a2b3c4d5e6f
```

**Response** `200 OK`
```json
{
  "message": "User deleted successfully."
}
```

---

## Error Responses

| Status | Meaning               | Example                                    |
|--------|------------------------|--------------------------------------------|
| `400`  | Bad Request            | Missing required fields                    |
| `404`  | Not Found              | User id doesn't exist                      |
| `409`  | Conflict               | Duplicate email                            |
| `500`  | Internal Server Error  | Unexpected server failure                  |
