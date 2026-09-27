# HOSPEX backend

Express REST API, MongoDB/Mongoose persistence, bcrypt password hashing and JWT bearer authentication. The Express server also serves the existing frontend at `http://localhost:5000`.

## Requirements

- Node.js 18 or later
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally

1. Open a terminal in this `backend` folder and run `npm install`.
2. Copy `.env.example` to `.env` and configure it (see **Environment variables** below).
3. Run `npm run dev` (or `npm start`).
4. Open `http://localhost:5000`. The API seeds four sample marketplace resources and a fixed admin account into an empty database.

To generate a JWT secret, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` from this folder, then paste its output into `.env`. Never commit `.env`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the API listens on (default `5000`). |
| `NODE_ENV` | `development` or `production`. |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_SECRET` | Random string, at least 32 characters, used to sign JWTs. |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`. |
| `CLIENT_ORIGINS` | Comma-separated list of allowed CORS origins. |
| `ADMIN_EMAIL` | Email of the fixed admin account, seeded automatically on server start. |
| `ADMIN_PASSWORD` | Password for that admin account (hashed before storage; never stored or logged in plain text). |

The admin account is created (or promoted, if a matching user already exists) every time the server starts, using `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Change the password by updating `.env` and updating the record in MongoDB directly — the seed script never overwrites an existing password.

## Project structure

```
HOSPEX/
├── index.html, list-resource.html, business-registration.html, admin-dashboard.html, ...  (frontend pages)
├── auth.js            shared frontend session/auth helper (token storage, authenticated fetch)
├── style.css, portal.css
└── backend/
    ├── uploads/       license documents and payment QR codes (multer, gitignored)
    └── src/
        ├── app.js               Express app: routes, static frontend serving, security middleware
        ├── server.js            entry point: connects DB, seeds data/admin, starts listening
        ├── config/db.js
        ├── models/              User, Business, Notification, Resource, ExchangeRequest
        ├── controllers/         auth, business, admin, notifications, resources, requests, stats
        ├── routes/
        ├── middleware/          auth.js (protect / requireAdmin), errorHandler.js
        ├── utils/                asyncHandler, httpError, upload (multer config)
        └── seed/                seedResources.js, seedAdmin.js
```

The Express server serves the whole frontend directory as static files, with a path guard that blocks any request to `/backend`, `.env`, or `.git`, so backend source and secrets are never exposed over HTTP.

## API overview

Base path: `/api/v1`. Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register a user account; returns user and JWT |
| POST | `/auth/login` | No | Login; returns user and JWT |
| GET | `/auth/me` | Bearer token | Current account |
| GET | `/resources?search=&category=&distance=&page=&limit=` | No | Browse available resources |
| GET | `/resources/mine` | Bearer token | Your listings |
| POST | `/resources` | Bearer token, **verified business** | Create a listing |
| DELETE | `/resources/:id` | Bearer token | Delete your own listing |
| GET | `/requests/mine` | Bearer token | Requests you sent |
| GET | `/requests/received` | Bearer token | Requests for your listings |
| POST | `/requests` | Bearer token | Request a resource |
| PATCH | `/requests/:id/status` | Bearer token | Accept, reject or complete a request |
| GET | `/stats` | No | Marketplace counts |
| GET | `/business/mine` | Bearer token | Current user's business + verification status |
| POST | `/business/register` | Bearer token, `multipart/form-data` | Submit a business for verification (license doc + QR code) |
| GET | `/notifications/mine` | Bearer token | Current user's notifications + unread count |
| POST | `/notifications/:id/read` | Bearer token | Mark one notification read |
| POST | `/notifications/read-all` | Bearer token | Mark all notifications read |
| POST | `/admin/login` | No | Admin login; returns user (role `admin`) and JWT |
| GET | `/admin/businesses?status=pending\|verified\|rejected` | Bearer token, **admin** | List business applications |
| POST | `/admin/businesses/:id/verify` | Bearer token, **admin** | Verify a business; notifies the owner |
| POST | `/admin/businesses/:id/reject` | Bearer token, **admin** | Reject a business; body `{ "reason": "..." }` (required); notifies the owner |

Protected requests send `Authorization: Bearer <token>`.

- Register body: `{ "businessName": "...", "businessType": "hotel", "email": "...", "password": "at least 8 characters" }`
- Resource body: `{ "name": "...", "category": "furniture", "quantity": 10, "condition": "good", "exchangeType": "donate", "description": "..." }`
- Request body: `{ "resourceId": "...", "quantity": 2, "message": "..." }`
- Business registration is sent as `multipart/form-data` with fields `businessName, businessType, ownerName, address, cityState, contactNumber, businessEmail, description, licenseNumber, upiId` plus file fields `licenseDocument` and `qrCode`.

## Business verification flow

1. A user registers and logs in (email + password; JWT stored client-side).
2. From the homepage, clicking **List your resource** checks the user's business verification status first. Unverified users are redirected to `business-registration.html` with the message *"Your business must be verified by admin before listing resources."*
3. The user submits the form on `business-registration.html`, uploading a license/registration document and a payment QR code. The business is saved with `verificationStatus: "pending"` and the user is notified.
4. The admin (seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, logged in via the **Admin Login** link at the bottom of the homepage) opens `admin-dashboard.html`, which lists pending applications with all submitted details and links to the uploaded documents.
5. The admin clicks **Verify** or **Reject** (rejection requires a reason). The business record is updated, and a notification is created for the user, visible via the notification bell on the homepage and, for rejections, on `business-registration.html`.
6. Only once `Business.verificationStatus === "verified"` does the backend allow `POST /resources` to succeed — this check happens in `resourceController.create` itself, so it cannot be bypassed by calling the API directly, only by the frontend gate being a courtesy on top of it.

## File upload requirements

- Handled by `multer` (disk storage), configured in `backend/src/utils/upload.js`.
- Two required files per business application: `licenseDocument` and `qrCode`.
- Allowed types: JPG, PNG, WebP, or PDF (license only needs to support PDF; QR codes are typically images but PDF is also accepted since the same filter is shared).
- Maximum size: **5 MB** per file, enforced by multer's `limits.fileSize` and rejected with a clear error otherwise.
- Files are stored under `backend/uploads/licenses` and `backend/uploads/qr` with randomized, unguessable filenames (not the original filename), and served back at `/uploads/licenses/<file>` / `/uploads/qr/<file>` for the admin dashboard to display.
- `backend/uploads/` is gitignored — do not commit uploaded documents.

## Security notes

- Passwords are hashed with bcrypt (12 salt rounds); plain-text passwords are never stored or logged.
- JWT bearer tokens authenticate all protected routes; `role`-based authorization (`requireAdmin` middleware) protects every admin route.
- Business verification is enforced server-side in the resource-creation controller, not just hidden in the UI.
- Helmet, CORS allow-listing, and per-route rate limiting are enabled in `app.js`.
- The static file server explicitly blocks `/backend`, `.env`, and `.git` paths so backend internals are never exposed.
- Valid business types: `hotel`, `restaurant`, `cafe`, `resort`, `banquet` (business *registration* type is a free-text field, separate from the account's `businessType` enum).
- Valid resource categories: `food`, `furniture`, `equipment`, `linen`, `supplies`, `packaging`.
- JWTs expire after seven days by default. Change `JWT_EXPIRES_IN` to adjust.
- Sample demo listings have no account owner, so they are browseable and requestable by signed-in users.
- Quantities must be positive whole numbers. Accepting a request atomically reduces the listing quantity; when stock reaches zero, the listing is marked unavailable. Requests can be completed after acceptance.
- Frontend stores its bearer token in `localStorage` for this simple static-app setup. For a public production deployment, serve the frontend and API over HTTPS and prefer secure, HttpOnly cookies or another XSS-resistant token strategy.
