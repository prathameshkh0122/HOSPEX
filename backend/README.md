# HOSPEX backend

Express REST API, MongoDB/Mongoose persistence, bcrypt password hashing and JWT bearer authentication. The Express server also serves the existing frontend at `http://localhost:5000`.

## Requirements

- Node.js 18 or later
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally

1. Open a terminal in this `backend` folder and run `npm install`.
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a random value with at least 32 characters. Set `MONGODB_URI` if your database is not the local default.
3. Run `npm run dev` (or `npm start`).
4. Open `http://localhost:5000`. The API seeds four sample marketplace resources into an empty database.

To generate a secret, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` from this folder, then paste its output into `.env`. Never commit `.env`.

## API overview

Base path: `/api/v1`. Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register a business; returns user and JWT |
| POST | `/auth/login` | No | Login; returns user and JWT |
| GET | `/auth/me` | Bearer token | Current account |
| GET | `/resources?search=&category=&distance=&page=&limit=` | No | Browse available resources |
| GET | `/resources/mine` | Bearer token | Your listings |
| POST | `/resources` | Bearer token | Create a listing |
| DELETE | `/resources/:id` | Bearer token | Delete your own listing |
| GET | `/requests/mine` | Bearer token | Requests you sent |
| GET | `/requests/received` | Bearer token | Requests for your listings |
| POST | `/requests` | Bearer token | Request a resource |
| PATCH | `/requests/:id/status` | Bearer token | Accept, reject or complete a request |
| GET | `/stats` | No | Marketplace counts |

Protected requests send `Authorization: Bearer <token>`. Register body: `{ "businessName": "...", "businessType": "hotel", "email": "...", "password": "at least 8 characters" }`. Resource body: `{ "name": "...", "category": "furniture", "quantity": 10, "condition": "good", "exchangeType": "donate", "description": "..." }`. Request body: `{ "resourceId": "...", "quantity": 2, "message": "..." }`.

## Notes

- Valid business types: `hotel`, `restaurant`, `cafe`, `resort`, `banquet`.
- Valid categories: `food`, `furniture`, `equipment`, `linen`, `supplies`, `packaging`.
- JWTs expire after seven days by default. Change `JWT_EXPIRES_IN` to adjust.
- Sample demo listings have no account owner, so they are browseable and requestable by signed-in businesses.
- Quantities must be positive whole numbers. Accepting a request atomically reduces the listing quantity; when stock reaches zero, the listing is marked unavailable. Requests can be completed after acceptance.
- Frontend stores its bearer token in localStorage for this simple static-app setup. For a public production deployment, serve the frontend and API over HTTPS and prefer secure, HttpOnly cookies or another XSS-resistant token strategy.
