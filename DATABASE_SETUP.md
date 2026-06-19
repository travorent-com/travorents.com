# TravoRents — Database Setup

The site now has a real database (SQLite) instead of only `localStorage`. Bookings and vehicles are stored in a file called `travorents.db`, created automatically the first time you start the server.

## What changed

- **`db.js`** — sets up the SQLite database and two tables: `vehicles` and `bookings`. On first run it seeds `vehicles` with the same 14 cars/bikes that were hardcoded in `index.html`.
- **`whatsapp-backend.js`** — the existing Express server now also serves the website itself and exposes a REST API for vehicles and bookings (see below). It also serves the new `admin.html` page.
- **`main.js`** — when a customer proceeds to payment, a booking is now saved to the database first (status `pending`), then updated to `completed` once Razorpay confirms payment. `localStorage` is still used as a working cache so nothing on the page breaks if the server is briefly unreachable.
- **`admin.html`** — a simple internal page (not linked from the public site) to view all bookings and manage vehicle listings. Open it at `http://127.0.0.1:3000/admin.html` while the server is running.

## Running it

```bash
npm install
npm start
```

This starts one server on port 3000 that serves the whole site, the API, and the admin page. Open `http://127.0.0.1:3000` in your browser.

The database file `travorents.db` will appear in this folder the first time you run it — back it up if you want to keep your booking history.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/vehicles` | List all vehicles. Add `?category=car` or `?category=bike` to filter. |
| GET | `/api/vehicles/:id` | Get one vehicle. |
| POST | `/api/vehicles` | Add a new vehicle. |
| PATCH | `/api/vehicles/:id` | Update availability, e.g. `{ "available": 0 }`. |
| POST | `/api/bookings` | Create a booking. |
| GET | `/api/bookings` | List all bookings. Add `?status=completed` or `?status=pending` to filter. |
| GET | `/api/bookings/:ref` | Get one booking by its reference code. |
| PATCH | `/api/bookings/:ref` | Update payment status/IDs after checkout. |

## A security note

The previous version of `whatsapp-backend.js` had real-looking Twilio credentials hardcoded as fallback values directly in the file. I removed them — the file now only reads `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` from environment variables, and falls back to "not configured" (simulated send) if they're not set. If those credentials were real and this code was ever pushed somewhere public, it's worth rotating them in your Twilio console.

To configure Twilio for real, set environment variables before starting the server, for example:

```bash
export TWILIO_ACCOUNT_SID=your_real_sid
export TWILIO_AUTH_TOKEN=your_real_token
npm start
```

## Moving beyond SQLite later

SQLite is a single file and is perfect for getting started or running on one server. If you later deploy this to a host where the filesystem doesn't persist between deploys (some serverless platforms), or you need multiple servers talking to the same data, you'd swap to Postgres — the table structure in `db.js` would carry over almost unchanged.
