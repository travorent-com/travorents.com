# TravoRents - Car & Bike Rental Website

A modern, responsive car and bike rental website built with Node.js, Express, and JSON-based storage.

## Features

✅ **Vehicle Management** - 14 pre-loaded vehicles (8 cars + 6 bikes)
✅ **Online Booking System** - Real-time availability checking
✅ **Payment Integration** - Razorpay test/live payments
✅ **Admin Panel** - View all bookings and vehicles
✅ **Responsive Design** - Works on desktop, tablet, mobile
✅ **24/7 Support** - Contact information and WhatsApp integration

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Database:** JSON files (no SQL required)
- **Payment:** Razorpay
- **Hosting:** Can be deployed on Heroku, Vercel, or any Node.js server

## Installation

### Prerequisites
- Node.js v14+ installed
- npm v6+ installed

### Steps

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/Travorent_Website.git
cd Travorent_Website
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create .env file:**
```env
PORT=3000
RAZORPAY_KEY_ID=rzp_test_T1W6m3eqkFe54D
RAZORPAY_KEY_SECRET=c7BHgJgJr343bKXS8L8O4YrW
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

4. **Start the server:**
```bash
npm start
```

5. **Open in browser:**
```
http://localhost:3000
```

## Project Structure

```
Travorent_Website/
├── index.html                 # Home page
├── admin.html                 # Admin dashboard
├── app.js                     # Frontend logic
├── whatsapp-backend.js        # Express server & API
├── db.js                      # Database layer (JSON)
├── package.json               # Dependencies
├── styles.css                 # Main styles
├── images/                    # Vehicle images
└── .env                       # Environment variables (create this)
```

## API Endpoints

### Get Vehicles
```
GET /api/vehicles              # All vehicles
GET /api/vehicles?category=car # Only cars
GET /api/vehicles?category=bike # Only bikes
GET /api/vehicles/:id          # Specific vehicle
```

### Create Booking
```
POST /api/bookings
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "vehicleId": 1,
  "pickupDate": "2026-06-20",
  "returnDate": "2026-06-21",
  "totalPrice": 1600
}
```

### Get Bookings
```
GET /api/bookings              # All bookings
```

## Test Credentials

**Razorpay Test Card:**
- Card: `4111 1111 1111 1111`
- Expiry: `12/25`
- CVV: `123`

## Usage

### For Customers
1. Visit the website
2. Fill booking form with vehicle type, location, dates
3. Click "Find Vehicle"
4. Select a vehicle and click "Book Now"
5. Review booking summary
6. Accept terms and proceed to payment
7. Payment will process (test mode - no real charges)

### For Admins
1. Go to `/admin.html`
2. View all vehicles and bookings
3. Track rental history

## Deployment

### Deploy to Heroku (Free)
```bash
heroku create your-app-name
git push heroku main
heroku config:set RAZORPAY_KEY_ID=your_key
heroku config:set RAZORPAY_KEY_SECRET=your_secret
```

### Deploy to Vercel
1. Connect GitHub repo to Vercel
2. Add environment variables in settings
3. Deploy

## Contact

- **Phone:** +91 6372465107
- **Email:** travorents.com@gmail.com
- **Location:** Nayapalli, Bhubaneswar, Odisha

## License

This project is open source and available under the MIT License.

## Author

Made with ❤️ by TravoRents Team
