const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : 'https://travorents-com.onrender.com';


const booking =
JSON.parse(localStorage.getItem("booking"));

if(!booking){
alert("No booking found");
window.location.href="index.html";
}

if (document.getElementById("vehicleName")) {
  document.getElementById("vehicleName").innerText = booking.vehicleName;
}
if (document.getElementById("vehicleImage")) {
  document.getElementById("vehicleImage").src = booking.vehicleImage;
}
if (document.getElementById("vehicleTransmission")) {
  document.getElementById("vehicleTransmission").innerText = booking.transmission || "Manual";
}
if (document.getElementById("vehicleFuel")) {
  document.getElementById("vehicleFuel").innerText = booking.fuel || "Petrol";
}
if (document.getElementById("vehicleSeats")) {
  document.getElementById("vehicleSeats").innerText = booking.seats || "2";
}

// Populate Pickup Location
if (document.getElementById("pickupLocation")) {
  document.getElementById("pickupLocation").innerText = booking.location;
}

// Populate Booking Dates nicely
if (document.getElementById("bookingDates")) {
  document.getElementById("bookingDates").innerText = `${booking.pickupDate} (${booking.pickupTime}) to ${booking.returnDate} (${booking.returnTime})`;
}

// Legacy elements backup (if they exist)
if (document.getElementById("pickupDate")) document.getElementById("pickupDate").innerText = booking.pickupDate;
if (document.getElementById("returnDate")) document.getElementById("returnDate").innerText = booking.returnDate;
if (document.getElementById("pickupTime")) document.getElementById("pickupTime").innerText = booking.pickupTime;
if (document.getElementById("returnTime")) document.getElementById("returnTime").innerText = booking.returnTime;

const rent =
Number(booking.amount);

const gst =
Math.round(rent*0.18);

const total =
rent+gst;

document.getElementById("rentPrice").innerText =
rent;

document.getElementById("gstPrice").innerText =
gst;

// Initialize payment method
let paymentMethod = "online";

function updateQRAndTotal(newTotal) {
  if (document.getElementById("totalPrice")) {
    document.getElementById("totalPrice").innerText = newTotal;
  }
  if (document.getElementById("qrTotalAmount")) {
    document.getElementById("qrTotalAmount").innerText = newTotal;
  }
  const qrImg = document.getElementById("qrCodeImage");
  if (qrImg) {
    const upiLink = "upi://pay?pa=8984330609@jupiteraxis&pn=TravoRents&am=" + newTotal + "&cu=INR&tn=TravoRents";
    qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(upiLink);
  }
}

// Initial update
updateQRAndTotal(total);

function setPaymentMethod(method) {
  paymentMethod = method;
  const tabOnline = document.getElementById("tabOnline");
  const tabQR = document.getElementById("tabQR");
  const qrArea = document.getElementById("qrPaymentArea");
  const onlineDesc = document.getElementById("onlinePaymentDesc");
  const payBtn = document.querySelector(".payment-btn");

  if (method === "online") {
    if (tabOnline) tabOnline.classList.add("active");
    if (tabQR) tabQR.classList.remove("active");
    if (onlineDesc) onlineDesc.style.display = "block";
    if (qrArea) qrArea.style.display = "none";
    if (payBtn) payBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span id="payBtnLabel">Confirm Booking (Pay on Visit)</span>';
  } else {
    if (tabQR) tabQR.classList.add("active");
    if (tabOnline) tabOnline.classList.remove("active");
    if (onlineDesc) onlineDesc.style.display = "none";
    if (qrArea) qrArea.style.display = "block";
    if (payBtn) payBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span id="payBtnLabel">Confirm & Send WhatsApp</span>';
  }
}

function makePayment(){
  // Get customer details from booking
  const customerName = document.getElementById("customerName")?.value || "Guest";
  const customerPhone = document.getElementById("customerPhone")?.value || "";
  const customerEmail = document.getElementById("customerEmail")?.value || "";
  const termsAccepted = (document.getElementById("checkDocs")?.checked && document.getElementById("checkRules")?.checked) || document.getElementById("termsCheckbox")?.checked || false;

  if (!termsAccepted) {
    alert("Please accept Terms & Conditions to proceed");
    return;
  }

  if (!customerPhone || !customerEmail) {
    alert("Please provide phone and email");
    return;
  }

  // Store customer details
  const booking = JSON.parse(localStorage.getItem("booking")) || {};
  booking.customerName = customerName;
  booking.customerPhone = customerPhone;
  booking.customerEmail = customerEmail;
  booking.paymentId = paymentMethod === "online" ? "CASH_ON_VISIT" : "QR_PAYMENT";
  localStorage.setItem("booking", JSON.stringify(booking));

  // Create a booking record in the database now, before payment, so we
  // never lose the booking even if the customer abandons checkout.
  createBookingInDb(booking).then((saved) => {
    if (saved && saved.booking_ref) {
      booking.bookingRef = saved.booking_ref;
      localStorage.setItem("booking", JSON.stringify(booking));
      
      if (paymentMethod === "online") {
        confirmCashBooking(booking);
      } else {
        confirmQRBooking(booking);
      }
    } else {
      // Backend is unreachable or returned an error!
      // Fallback to local-only flow so nothing on the page breaks.
      console.warn("Backend server unreachable. Falling back to local checkout.");
      const offlineRef = "TR-" + Date.now();
      booking.bookingRef = offlineRef;
      booking.payment_status = paymentMethod === "online" ? "cash_on_visit" : "qr_pending";
      localStorage.setItem("booking", JSON.stringify(booking));
      
      if (paymentMethod === "online") {
        window.location.href = `payment-success.html?ref=${offlineRef}&cash=1`;
      } else {
        window.location.href = `payment-success.html?ref=${offlineRef}&qr=1`;
      }
    }
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

function confirmQRBooking(booking) {
  fetch(`${API_BASE}/api/confirm-qr-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingRef: booking.bookingRef
    })
  })
  .then(res => res.json())
  .then(data => {
    // Redirect to success page even if api call returned success:false as backup
    window.location.href = `payment-success.html?ref=${booking.bookingRef}&qr=1`;
  })
  .catch(err => {
    console.error("QR Confirm Error:", err);
    // Proceed to success page anyway as fallback
    window.location.href = `payment-success.html?ref=${booking.bookingRef}&qr=1`;
  });
}

function confirmCashBooking(booking) {
  fetch(`${API_BASE}/api/confirm-cash-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingRef: booking.bookingRef
    })
  })
  .then(res => res.json())
  .then(data => {
    // Redirect to success page even if api call returned success:false as backup
    window.location.href = `payment-success.html?ref=${booking.bookingRef}&cash=1`;
  })
  .catch(err => {
    console.error("Cash Confirm Error:", err);
    // Proceed to success page anyway as fallback
    window.location.href = `payment-success.html?ref=${booking.bookingRef}&cash=1`;
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

    updateQRAndTotal(total.toFixed(0));
}

