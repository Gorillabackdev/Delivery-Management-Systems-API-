# Delivery Management System API

A Node.js/Express API scaffold for a delivery management system with MongoDB, logging, and authentication.

**What�s implemented so far**
- Express app with JSON parsing, CORS, and request logging
- MongoDB connection helper
- Auth module with register/login, password hashing, JWT auth, and role-based access (Admin/User/Rider)

**Tech stack**
- Node.js, Express
- MongoDB + Mongoose
- JWT + bcryptjs

**Project structure**
- `server.js` boots the app and connects to MongoDB
- `src/app.js` configures middleware and routes
- `src/config/db.js` MongoDB connection
- `src/models/auth/` auth module (model, controller, service, routes)

**Environment variables**
Create a `.env` file using `.env.example` as a template.
Environment-specific templates:
- `.env.development.example`
- `.env.production.example`

**Install & run**
```
npm install
npm run dev
```

**Routes**
Base: `http://localhost:5000`

Auth routes:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

User routes:
- `GET /api/users` (Admin)
- `GET /api/users/:id` (Admin or self)
- `PUT /api/users/:id` (Admin or self)
- `PATCH /api/users/:id/deactivate` (Admin)
- `PATCH /api/users/:id/role` (Admin)
- `GET /api/users/profile`
- `PATCH /api/users/change-password`

Order routes:
- `POST /api/orders`
- `GET /api/orders` (with pagination)
- `GET /api/orders/:id`
- `PUT /api/orders/:id`
- `PUT /api/orders/:id/cancel`
- `PUT /api/orders/:id/assign` (Admin)
- `PUT /api/orders/:id/auto-assign` (Admin)
- `PUT /api/orders/:id/accept` (Rider)
- `PUT /api/orders/:id/decline` (Rider)
- `PUT /api/orders/:id/status` (Rider/Admin)
- `PUT /api/orders/:id/location` (Rider)
- `GET /api/orders/:id/track`

Wallet routes:
- `GET /api/wallet`
- `GET /api/wallet/transactions`
- `POST /api/wallet/deposit`
- `POST /api/wallet/withdraw`
- `POST /api/wallet/transfer`

Payments:
- `POST /api/payments/pay`
- `POST /api/payments/stripe/intent`
- `POST /api/payments/stripe/webhook`

Rider:
- `PATCH /api/rider/status`
- `GET /api/rider/earnings`
- `GET /api/rider/orders`

Admin:
- `GET /api/admin/stats`
- `GET /api/admin/orders`
- `GET /api/admin/transactions`

**Documentation**
- Architecture: `docs/architecture.md`
- ER diagram: `docs/erd.md`
- Contribution guide: `CONTRIBUTING.md`
- Postman collection: `docs/api.postman.collection.json`
- Deployment notes: `docs/deployment.md`
- Roles & responsibilities: `docs/roles.md`

**Auth request examples**
Register:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "User"
}
```

Login:
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Auth response**
Both register/login return:
- `token` (JWT)
- `user` object with `id`, `name`, `email`, `role`

**Role-based access**
Available roles: `Admin`, `User`, `Rider`

To protect a route:
```js
const { requireAuth, requireRole } = require("./models/auth/auth.controller");

router.get("/admin-only", requireAuth, requireRole("Admin"), (req, res) => {
  res.json({ ok: true });
});
```

**Notes**
- Passwords are hashed with bcrypt before storage
- JWT is signed using `JWT_SECRET`
