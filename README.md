# Names of Collaborators
1.**Name:**Isaac Emmanuel
**Github:**github.com/Gorrillabackdev

2.**Name:**Oluwafemi Kareem
**Github:**github.com/Zamar443

3.**Name:**Ameh Timothy
**Github:**github.com/Ametech

4.**Name:**Akintoye Peterpaul
**Github:**github.com/AppeiYa

5.**Name:**IIiya Grace Rishama
**Github:**github.com/Grace-iliya

6.**Name:**Adebowale Daniel Olasupo
**Github:**github.com/olabowale2cool

7.**Name:**Uche chukwuebuka prince
**Github:**github.com/thissprince

8.**Name:**Mudasiru Abdulsalam Oluwatosin
**Github:**github.com/tosvn

9.**Name:**Sylvester-Ali Kizito
**Github:**github.com/kizito-devbio

10.**Name:**Princewill Ehirine
**Github:**github.com/princelex4

11.**Name:**Nebechi Chika
**Github:**github.com/chika-pixel632

12.**Name:**Toyeeb Kazeem
**Github:**github.com/AnalytixTech

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
Create a `.env` file (already present in this repo) with:
```

```

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
