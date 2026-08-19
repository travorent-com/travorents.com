// db.js - Simple JSON file storage (no database needed)
// All bookings and vehicles are stored in JSON files

const fs = require('fs');
const path = require('path');

const VEHICLES_FILE = path.join(__dirname, 'data-vehicles.json');
const BOOKINGS_FILE = path.join(__dirname, 'data-bookings.json');

// Initialize data files
function initFiles() {
  if (!fs.existsSync(VEHICLES_FILE)) {
    const defaultVehicles = [
      { id: 1, name: 'Swift Dzire New Model', category: 'car', image: 'images/maruti dizaer.jpeg', price_12hr: 1300, price_24hr: 1600, transmission: 'Manual', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 2, name: 'Maruti Alto', category: 'car', image: 'images/alto k10.jpeg', price_12hr: 1020, price_24hr: 1320, transmission: 'Manual', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 3, name: 'Suzuki Baleno', category: 'car', image: 'images/baleno.jpeg', price_12hr: 1400, price_24hr: 1700, transmission: 'Manual', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 4, name: 'i20 Sunroof 2025', category: 'car', image: 'images/hundyai.jpeg', price_12hr: 1500, price_24hr: 2000, transmission: 'Manual', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 5, name: 'Hyundai Venue SX', category: 'car', image: 'images/venue.jpeg', price_12hr: 1700, price_24hr: 2300, transmission: 'Manual', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 6, name: 'Kia Carens (7 Seater)', category: 'car', image: 'images/Kia Carens.jpeg', price_12hr: 2500, price_24hr: 3000, transmission: 'Manual', fuel: 'Petrol', seats: 7, available: 1 },
      { id: 7, name: 'Mahindra Thar ROX 2025', category: 'car', image: 'images/thar.jpeg', price_12hr: 3500, price_24hr: 4000, transmission: 'Manual', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 8, name: 'Baleno Automatic', category: 'car', image: 'images/baleno automatic.jpeg', price_12hr: 1600, price_24hr: 2000, transmission: 'Automatic', fuel: 'Petrol', seats: 5, available: 1 },
      { id: 9, name: 'Royal Enfield Bullet 350', category: 'bike', image: 'images/Royal Enfield.jpeg', price_12hr: 800, price_24hr: 1100, transmission: 'Manual', fuel: 'Petrol', seats: 2, available: 1 },
      { id: 10, name: 'KTM 200', category: 'bike', image: 'images/ktm duke.jpeg', price_12hr: 1000, price_24hr: 1400, transmission: 'Manual', fuel: 'Petrol', seats: 2, available: 1 },
      { id: 11, name: 'Yamaha R15 V4', category: 'bike', image: 'images/yamaha.jpeg', price_12hr: 1000, price_24hr: 1200, transmission: 'Manual', fuel: 'Petrol', seats: 2, available: 1 },
      { id: 12, name: 'Honda Activa 6G', category: 'bike', image: 'images/honda activa.jpeg', price_12hr: 400, price_24hr: 500, transmission: 'Automatic', fuel: 'Petrol', seats: 2, available: 1 },
      { id: 13, name: 'Hero Pleasure Plus', category: 'bike', image: 'images/Hero Pleasure Plus.jpeg', price_12hr: 400, price_24hr: 550, transmission: 'Automatic', fuel: 'Petrol', seats: 2, available: 1 },
      { id: 14, name: 'Pulsar 150', category: 'bike', image: 'images/pulser 150.jpeg', price_12hr: 500, price_24hr: 700, transmission: 'Manual', fuel: 'Petrol', seats: 2, available: 1 }
    ];
    fs.writeFileSync(VEHICLES_FILE, JSON.stringify(defaultVehicles, null, 2));
    console.log('[DB] Initialized vehicles data');
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
    console.log('[DB] Initialized bookings data');
  }
}

initFiles();

// Helper functions
function getVehicles() {
  return JSON.parse(fs.readFileSync(VEHICLES_FILE, 'utf8'));
}

function saveVehicles(data) {
  fs.writeFileSync(VEHICLES_FILE, JSON.stringify(data, null, 2));
}

function getBookings() {
  return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
}

function saveBookings(data) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));
}

// Mock db object to match the old interface
module.exports = {
  prepare: function(query) {
    return {
      all: function(param) {
        if (query.includes('SELECT * FROM vehicles')) {
          const vehicles = getVehicles();
          return param ? vehicles.filter(v => v.category === param) : vehicles;
        }
        if (query.includes('SELECT * FROM bookings')) {
          const bookings = getBookings();
          return param ? bookings.filter(b => b.payment_status === param) : bookings;
        }
        return [];
      },
      get: function(param) {
        if (query.includes('COUNT')) return { count: getVehicles().length };
        if (query.includes('vehicles')) {
          const vehicles = getVehicles();
          return vehicles.find(v => v.id === param || v.id === parseInt(param));
        }
        const bookings = getBookings();
        return bookings.find(b => b.id === param || b.booking_ref === param);
      },
      run: function(...args) {
        if (query.includes('INSERT INTO vehicles')) {
          const vehicles = getVehicles();
          const raw = typeof args[0] === 'object' ? args[0] : {};
          const newVehicle = {
            id: vehicles.length + 1,
            name: args[0] || raw.name || 'Vehicle',
            category: args[1] || raw.category || 'car',
            image: args[2] || raw.image || '',
            price_12hr: args[3] ?? raw.price_12hr ?? null,
            price_24hr: args[4] ?? raw.price_24hr ?? 1500,
            transmission: args[5] || raw.transmission || 'Manual',
            fuel: args[6] || raw.fuel || 'Petrol',
            location: args[7] || raw.location || 'Nayapalli (Main Office)',
            seats: args[8] ?? raw.seats ?? 5,
            available: 1
          };
          vehicles.push(newVehicle);
          saveVehicles(vehicles);
          return { lastInsertRowid: newVehicle.id };
        }
        if (query.includes('INSERT INTO bookings')) {
          const bookings = getBookings();
          const raw = args[0] || {};
          const bRef = raw.bookingRef || raw.booking_ref || ('TR-' + Date.now());
          const vName = raw.vehicleName || raw.vehicle_name || 'Vehicle';
          const vImg = raw.vehicleImage || raw.vehicle_image || '';
          const amt = Number(raw.amount || 0);
          const gstVal = Number(raw.gst || Math.round(amt * 0.18));
          const totAmt = Number(raw.totalAmount || raw.total_amount || (amt + gstVal));
          const cName = raw.customerName || raw.customer_name || 'Guest';
          const cPhone = raw.customerPhone || raw.customer_phone || '';
          const cEmail = raw.customerEmail || raw.customer_email || '';
          const pDate = raw.pickupDate || raw.pickup_date || '';
          const pTime = raw.pickupTime || raw.pickup_time || '';
          const rDate = raw.returnDate || raw.return_date || '';
          const rTime = raw.returnTime || raw.return_time || '';
          const loc = raw.location || '';
          const trans = raw.transmission || '';
          const fuelVal = raw.fuel || 'Petrol';
          const seatsVal = raw.seats || 5;

          const newBooking = {
            id: bookings.length + 1,
            booking_ref: bRef,
            bookingRef: bRef,
            vehicle_id: raw.vehicleId || raw.vehicle_id || null,
            vehicleId: raw.vehicleId || raw.vehicle_id || null,
            vehicle_name: vName,
            vehicleName: vName,
            vehicle_image: vImg,
            vehicleImage: vImg,
            amount: amt,
            gst: gstVal,
            total_amount: totAmt,
            totalAmount: totAmt,
            transmission: trans,
            fuel: fuelVal,
            seats: seatsVal,
            pickup_date: pDate,
            pickupDate: pDate,
            pickup_time: pTime,
            pickupTime: pTime,
            return_date: rDate,
            returnDate: rDate,
            return_time: rTime,
            returnTime: rTime,
            location: loc,
            customer_name: cName,
            customerName: cName,
            customer_phone: cPhone,
            customerPhone: cPhone,
            customer_email: cEmail,
            customerEmail: cEmail,
            payment_status: raw.paymentStatus || raw.payment_status || 'pending',
            created_at: new Date().toISOString()
          };
          bookings.push(newBooking);
          saveBookings(bookings);
          return { lastInsertRowid: newBooking.id };
        }
        if (query.includes('UPDATE vehicles')) {
          const vehicles = getVehicles();
          const targetId = Number(args[1]);
          const idx = vehicles.findIndex(v => Number(v.id) === targetId);
          if (idx >= 0) {
            vehicles[idx].available = Number(args[0]) ? 1 : 0;
            saveVehicles(vehicles);
          }
          return { changes: 1 };
        }
        if (query.includes('DELETE FROM vehicles')) {
          const vehicles = getVehicles();
          const targetId = Number(args[0]);
          const filtered = vehicles.filter(v => Number(v.id) !== targetId);
          saveVehicles(filtered);
          return { changes: 1 };
        }
        if (query.includes('DELETE FROM bookings')) {
          const bookings = getBookings();
          const ref = String(args[0]);
          const filtered = bookings.filter(b => (b.booking_ref || b.bookingRef) !== ref);
          saveBookings(filtered);
          return { changes: 1 };
        }
        if (query.includes('UPDATE bookings')) {
          const bookings = getBookings();
          const ref = String(args[args.length - 1]);
          const idx = bookings.findIndex(b => (b.booking_ref || b.bookingRef) === ref);
          if (idx >= 0) {
            if (args.length === 5) {
              if (args[0] !== null) bookings[idx].payment_id = args[0];
              if (args[1] !== null) bookings[idx].order_id = args[1];
              if (args[2] !== null) bookings[idx].place = args[2];
              if (args[3] !== null) {
                bookings[idx].payment_status = args[3];
                bookings[idx].paymentStatus = args[3];
              }
            } else if (args.length === 3) {
              bookings[idx].payment_status = args[0];
              bookings[idx].paymentStatus = args[0];
              bookings[idx].order_id = args[1];
            } else if (args[0] && typeof args[0] === 'object') {
              Object.assign(bookings[idx], args[0]);
            }
            bookings[idx].updated_at = new Date().toISOString();
          }
          saveBookings(bookings);
          return { changes: 1 };
        }
        return { changes: 1 };
      }
    };
  },
  exec: function() {}
};
