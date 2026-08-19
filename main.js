// Base URL of the TravoRents backend (serves the API + the database).
const API_BASE = (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes('http') && !window.location.origin.includes('file:'))
  ? window.location.origin
  : "http://127.0.0.1:3000";

document.addEventListener("DOMContentLoaded", function () {
  if (!window.location.pathname.includes("booking-summary.html")) return;

  const booking = JSON.parse(localStorage.getItem("booking"));
  if (!booking) {
    alert("No vehicle selected. Returning to fleet catalog.");
    window.location.href = "index.html#vehicles";
    return;
  }

  const vName = document.getElementById("vehicleName");
  if (vName) vName.innerText = booking.vehicleName || "Vehicle";
  const vImg = document.getElementById("vehicleImage");
  if (vImg) vImg.src = booking.vehicleImage || "";
  const pDate = document.getElementById("pickupDate");
  if (pDate) pDate.innerText = booking.pickupDate || "";
  const rDate = document.getElementById("returnDate");
  if (rDate) rDate.innerText = booking.returnDate || "";
  const pTime = document.getElementById("pickupTime");
  if (pTime) pTime.innerText = booking.pickupTime || "";
  const rTime = document.getElementById("returnTime");
  if (rTime) rTime.innerText = booking.returnTime || "";
  const pLoc = document.getElementById("pickupLocation");
  if (pLoc) pLoc.innerText = booking.location || "Nayapalli (Main Office)";

  const rent = Number(booking.amount) || 0;
  const gst = Math.round(rent * 0.18);
  const total = rent + gst;

  const rPrice = document.getElementById("rentPrice");
  if (rPrice) rPrice.innerText = rent;
  const gPrice = document.getElementById("gstPrice");
  if (gPrice) gPrice.innerText = gst;
  const tPrice = document.getElementById("totalPrice");
  if (tPrice) tPrice.innerText = total;
});

function makePayment() {
  const customerName = document.getElementById("customerName")?.value || "Guest";
  const customerPhone = document.getElementById("customerPhone")?.value || "";
  const customerEmail = document.getElementById("customerEmail")?.value || "";
  const termsAccepted = document.getElementById("termsCheckbox")?.checked || false;

  if (!termsAccepted) {
    alert("Please accept Terms & Conditions to proceed");
    return;
  }

  if (!customerPhone || !customerEmail) {
    alert("Please provide phone and email");
    return;
  }

  const booking = JSON.parse(localStorage.getItem("booking")) || {};
  booking.customerName = customerName;
  booking.customerPhone = customerPhone;
  booking.customerEmail = customerEmail;
  booking.paymentId = "pending";
  localStorage.setItem("booking", JSON.stringify(booking));

  createBookingInDb(booking).then((saved) => {
    if (saved && saved.booking_ref) {
      booking.bookingRef = saved.booking_ref;
      localStorage.setItem("booking", JSON.stringify(booking));
    }
    openPhonePe(booking);
  });
}

function createBookingInDb(booking) {
  return fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleName: booking.vehicleName,
      vehicleImage: booking.vehicleImage,
      amount: booking.amount,
      transmission: booking.transmission,
      fuel: booking.fuel,
      seats: booking.seats,
      pickupDate: booking.pickupDate,
      pickupTime: booking.pickupTime,
      returnDate: booking.returnDate,
      returnTime: booking.returnTime,
      location: booking.location,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
    }),
  })
    .then((res) => res.json())
    .then((data) => (data.success ? data.booking : null))
    .catch((err) => {
      console.error("Could not save booking to database:", err);
      return null; // fall back to localStorage-only flow
    });
}

function updateBookingInDb(bookingRef, fields) {
  if (!bookingRef) return Promise.resolve(null);
  return fetch(`${API_BASE}/api/bookings/${bookingRef}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  })
    .then((res) => res.json())
    .catch((err) => {
      console.error("Could not update booking in database:", err);
      return null;
    });
}

function openPhonePe(booking) {
  const totalAmount = document.getElementById("totalPrice").innerText;

  fetch(`${API_BASE}/api/initiate-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingRef: booking.bookingRef,
      amount: totalAmount,
      customerPhone: booking.customerPhone
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.paymentUrl) {
      // Redirect to PhonePe payment URL
      window.location.href = data.paymentUrl;
    } else {
      alert("Payment initiation failed: " + (data.message || "Unknown error"));
    }
  })
  .catch(err => {
    console.error("PhonePe Error:", err);
    alert("Could not start payment. Please try again.");
  });
}

function sendBookingConfirmation(booking) {
  const backendUrl = `${API_BASE}/api/send-whatsapp`;
  
  const payload = {
  bookingId: booking.bookingRef || ("TR-" + Date.now()),
  vehicle: booking.vehicleName,
  amount: document.getElementById("totalPrice").innerText,
  customerName: booking.customerName,
  customerPhone: booking.customerPhone,
  pickupDate: booking.pickupDate,
  pickupTime: booking.pickupTime,
  returnDate: booking.returnDate,
  returnTime: booking.returnTime,
  location: booking.location,
  contacts: [booking.customerPhone]
};


  fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    console.log("WhatsApp notification sent:", data);
  })
  .catch(err => {
    console.error("Error sending WhatsApp:", err);
  });
}
function openBookingSummary(
vehicleName,
vehicleImage,
amount,
transmission,
fuel,
seats
){

const booking = {

vehicleName,
vehicleImage,
amount,
transmission,
fuel,
seats,

pickupDate:
document.getElementById("bkPickupDate")?.value || "",

pickupTime:
document.getElementById("bkPickupTime")?.value || "",

returnDate:
document.getElementById("bkReturnDate")?.value || "",

returnTime:
document.getElementById("bkReturnTime")?.value || "",

location:
document.getElementById("bkLocation")?.value || ""

};

localStorage.setItem(
"booking",
JSON.stringify(booking)
);

loadSummary();

document
.getElementById("summaryOverlay")
.classList.add("active");

}function loadSummary(){

const booking =
JSON.parse(localStorage.getItem("booking"));

if(!booking) return;

document.getElementById("summVehicleName")
.innerText =
booking.vehicleName;

document.getElementById("summVehicleImg")
.innerHTML =
`<img src="${booking.vehicleImage}"
style="width:100%;height:100%;object-fit:contain">`;

document.getElementById("summPickupDate")
.innerText =
booking.pickupDate;

document.getElementById("summPickupTime")
.innerText =
booking.pickupTime;

document.getElementById("summReturnDate")
.innerText =
booking.returnDate;

document.getElementById("summReturnTime")
.innerText =
booking.returnTime;

document.getElementById("summLocationName")
.innerText =
booking.location;

document.getElementById("summTransmission")
.innerText =
booking.transmission;

document.getElementById("summFuel")
.innerText =
booking.fuel;

document.getElementById("summSeats")
.innerText =
booking.seats;

const gst =
Math.round(booking.amount * 0.18);

const total =
booking.amount + gst + 29.5;

document.getElementById("billingBase")
.innerText =
"₹"+booking.amount;

document.getElementById("billingTax")
.innerText =
"₹"+gst;

document.getElementById("billingSubtotal")
.innerText =
"₹"+(booking.amount+gst);

document.getElementById("billingTotal")
.innerText =
"₹"+total;

}


function updateHelmetCharge() {
    const helmetQty = parseInt(document.getElementById("helmetCount").value) || 0;

    let helmetCharge = 0;

    // First helmet free
    if (helmetQty > 1) {
        helmetCharge = (helmetQty - 1) * 50;
    }

    const vehicleAmount = currentVehiclePrice; // your base rental amount
    const gst = Math.round(vehicleAmount * 0.18);

    const total = vehicleAmount + gst + helmetCharge;

    document.getElementById("helmetCharge").innerText = `₹${helmetCharge}`;
    document.getElementById("billingTotal").innerText = `₹${total}`;
}
function updateHelmetCharges() {

    const helmetCount =
        parseInt(document.getElementById("helmetCount").value) || 0;

    let helmetCharge = 0;

    // First helmet free
    if (helmetCount > 1) {
        helmetCharge = (helmetCount - 1) * 50;
    }

    // Read current values
    const rentalCharge = parseFloat(
        document.getElementById("rentalCharge").innerText.replace(/[^\d.]/g, '')
    ) || 0;

    const gst = parseFloat(
        document.getElementById("gstAmount").innerText.replace(/[^\d.]/g, '')
    ) || 0;

    const total =
        rentalCharge +
        gst +
        helmetCharge;

    // Update right side billing
    document.getElementById("helmetChargeAmount").innerText =
        "₹" + helmetCharge;

    document.getElementById("totalDueAmount").innerText =
        "₹" + total;
}
function updateHelmetCharge() {

    const helmetCount =
        parseInt(document.getElementById("helmetCount").value);

    let helmetCharge = 0;

    // First helmet free
    if (helmetCount > 1) {
        helmetCharge = (helmetCount - 1) * 50;
    }

    // Update Helmet Charges row
    document.getElementById("helmetCharge").textContent =
        helmetCharge;

    // Get rental price
    const rentPrice =
        parseFloat(
            document.getElementById("rentPrice").textContent
        ) || 0;

    // Get GST
    const gstPrice =
        parseFloat(
            document.getElementById("gstPrice").textContent
        ) || 0;

    // Calculate Total
    const total =
        rentPrice +
        gstPrice +
        helmetCharge;

    document.getElementById("totalPrice").textContent =
        total.toFixed(0);
}