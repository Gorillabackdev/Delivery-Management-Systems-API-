# Delivery Management System API

Production‑ready delivery backend with auth, orders, riders, wallet, payments, admin stats, and Stripe support.

**Highlights**
- JWT auth with refresh tokens
- Orders lifecycle with rider assignment and tracking
- Wallet system with deposits, withdrawals, transfers, and transactions
- Admin stats and audit logging
- Stripe payment intents + webhook support
- Security middleware (rate limit, helmet, sanitization)

**Tech Stack**
- Node.js + Express
- MongoDB + Mongoose
- JWT + bcryptjs

**Quick Start**
```bash
npm install
npm run dev
```

**Environment**
Use `.env.example` as a base. Templates:
- `.env.development.example`
- `.env.production.example`

**Project Structure**
- `server.js` app entry
- `src/app.js` middleware + routes
- `src/config/db.js` MongoDB connection
- `src/models/` Mongoose models
- `src/controllers/` route handlers
- `src/routes/` API routes
- `src/middlewares/` auth, errors, validation
- `src/utils/` tokens, logger

**Routes**
Base: `http://localhost:5000`

Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Users
- `GET /api/users` (Admin)
- `GET /api/users/:id` (Admin or self)
- `PUT /api/users/:id` (Admin or self)
- `PATCH /api/users/:id/deactivate` (Admin)
- `PATCH /api/users/:id/role` (Admin)
- `GET /api/users/profile`
- `PATCH /api/users/change-password`

Orders
- `POST /api/orders`
- `GET /api/orders` (pagination, filter, sort)
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

Wallet
- `GET /api/wallet`
- `GET /api/wallet/transactions`
- `POST /api/wallet/deposit`
- `POST /api/wallet/withdraw`
- `POST /api/wallet/transfer`

Payments
- `POST /api/payments/pay` (wallet)
- `POST /api/payments/stripe/intent`
- `POST /api/payments/stripe/webhook`

Rider
- `PATCH /api/rider/status`
- `GET /api/rider/earnings`
- `GET /api/rider/orders`

Admin
- `GET /api/admin/stats`
- `GET /api/admin/orders`
- `GET /api/admin/transactions`

**Docs**
- Architecture: `docs/architecture.md`
- ERD: `docs/erd.md`
- Roles: `docs/roles.md`
- Deployment: `docs/deployment.md`
- Postman: `docs/api.postman.collection.json`
- Contributing: `CONTRIBUTING.md`

**Auth Example**
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

**Notes**
- JWT uses `JWT_SECRET`.
- Stripe requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
