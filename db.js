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

// Helper function to normalize bookings between snake_case and camelCase
function normalizeBooking(b) {
  if (!b) return b;
  return {
    ...b,
    // Ensure snake_case keys are present
    booking_ref: b.booking_ref || b.bookingRef,
    vehicle_id: b.vehicle_id !== undefined ? b.vehicle_id : b.vehicleId,
    vehicle_name: b.vehicle_name || b.vehicleName,
    vehicle_image: b.vehicle_image || b.vehicleImage,
    total_amount: b.total_amount !== undefined ? b.total_amount : b.totalAmount,
    pickup_date: b.pickup_date || b.pickupDate,
    pickup_time: b.pickup_time || b.pickupTime,
    return_date: b.return_date || b.returnDate,
    return_time: b.return_time || b.returnTime,
    customer_name: b.customer_name || b.customerName,
    customer_phone: b.customer_phone || b.customerPhone,
    customer_email: b.customer_email || b.customerEmail,
    payment_status: b.payment_status || b.paymentStatus,
    
    // Ensure camelCase keys are also present
    bookingRef: b.bookingRef || b.booking_ref,
    vehicleId: b.vehicleId !== undefined ? b.vehicleId : b.vehicle_id,
    vehicleName: b.vehicleName || b.vehicle_name,
    vehicleImage: b.vehicleImage || b.vehicle_image,
    totalAmount: b.totalAmount !== undefined ? b.totalAmount : b.total_amount,
    pickupDate: b.pickupDate || b.pickup_date,
    pickupTime: b.pickupTime || b.pickup_time,
    returnDate: b.returnDate || b.return_date,
    returnTime: b.returnTime || b.return_time,
    customerName: b.customerName || b.customer_name,
    customerPhone: b.customerPhone || b.customer_phone,
    customerEmail: b.customerEmail || b.customer_email,
    paymentStatus: b.paymentStatus || b.payment_status,
  };
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
          const filtered = param ? bookings.filter(b => b.payment_status === param || b.paymentStatus === param) : bookings;
          return filtered.map(normalizeBooking);
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
        const booking = bookings.find(b => b.id === param || b.booking_ref === param || b.bookingRef === param);
        return booking ? normalizeBooking(booking) : undefined;
      },
      run: function(...args) {
        if (query.includes('INSERT INTO vehicles')) {
          const vehicles = getVehicles();
          const newVehicle = { id: vehicles.length + 1, ...args[0] };
          vehicles.push(newVehicle);
          saveVehicles(vehicles);
          return { lastInsertRowid: newVehicle.id };
        }
        if (query.includes('INSERT INTO bookings')) {
          const bookings = getBookings();
          const newBooking = normalizeBooking({ 
            id: bookings.length + 1, 
            payment_status: 'pending',
            paymentStatus: 'pending',
            booking_ref: args[0].bookingRef,
            ...args[0] 
          });
          bookings.push(newBooking);
          saveBookings(bookings);
          return { lastInsertRowid: newBooking.id };
        }
        if (query.includes('UPDATE vehicles')) {
          const vehicles = getVehicles();
          const idx = vehicles.findIndex(v => v.id === args[1]);
          if (idx >= 0) vehicles[idx].available = args[0];
          saveVehicles(vehicles);
        }
        if (query.includes('UPDATE bookings')) {
          const bookings = getBookings();
          const ref = args[args.length - 1];
          const idx = bookings.findIndex(b => b.booking_ref === ref || b.bookingRef === ref);
          if (idx >= 0) {
            if (args.length === 5) {
              if (args[0] !== null) {
                bookings[idx].payment_id = args[0];
                bookings[idx].paymentId = args[0];
              }
              if (args[1] !== null) {
                bookings[idx].order_id = args[1];
                bookings[idx].orderId = args[1];
              }
              if (args[2] !== null) bookings[idx].place = args[2];
              if (args[3] !== null) {
                bookings[idx].payment_status = args[3];
                bookings[idx].paymentStatus = args[3];
              }
            } else if (args.length === 3) {
              bookings[idx].payment_status = args[0];
              bookings[idx].paymentStatus = args[0];
              bookings[idx].order_id = args[1];
              bookings[idx].orderId = args[1];
            }
            bookings[idx].updated_at = new Date().toISOString();
            bookings[idx] = normalizeBooking(bookings[idx]);
          }
          saveBookings(bookings);
        }
        return { changes: 1 };
      }
    };
  },
  exec: function() {}
};


