const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : 'https://travorents-com.onrender.com';

// Helper for fetch with timeout to prevent page freezing on slow/cold backends
function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
}

let booking = null;
try {
  const rawBooking = localStorage.getItem("booking");
  if (rawBooking) {
    booking = JSON.parse(rawBooking);
  }
} catch (e) {
  console.warn("Could not parse booking from localStorage:", e);
}

const isSummaryPage = window.location.pathname.includes("booking-summary");
if (isSummaryPage && !booking) {
  console.warn("No active booking found. Redirecting to home.");
  window.location.href = "index.html";
}

if (booking) {
  if (document.getElementById("vehicleName")) {
    document.getElementById("vehicleName").innerText = booking.vehicleName || "Selected Vehicle";
  }
  if (document.getElementById("vehicleImage") && booking.vehicleImage) {
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
    document.getElementById("pickupLocation").innerText = booking.location || "Nayapalli";
  }

  // Populate Booking Dates nicely
  if (document.getElementById("bookingDates")) {
    const pDate = booking.pickupDate || "";
    const pTime = booking.pickupTime ? ` (${booking.pickupTime})` : "";
    const rDate = booking.returnDate || "";
    const rTime = booking.returnTime ? ` (${booking.returnTime})` : "";
    document.getElementById("bookingDates").innerText = `${pDate}${pTime} to ${rDate}${rTime}`;
  }

  const rent = Number(booking.amount) || 0;
  const gst = Math.round(rent * 0.18);
  const total = rent + gst;

  if (document.getElementById("rentPrice")) document.getElementById("rentPrice").innerText = rent;
  if (document.getElementById("gstPrice")) document.getElementById("gstPrice").innerText = gst;
  
  if (typeof updateQRAndTotal === 'function') {
    updateQRAndTotal(total);
  }
}

// Initialize payment method
let paymentMethod = "online";

function updateQRAndTotal(newTotal) {
  if (document.getElementById("totalPrice")) {
    document.getElementById("totalPrice").innerText = newTotal;
  }
  if (document.getElementById("qrTotalAmount")) {
    document.getElementById("qrTotalAmount").innerText = newTotal;
  }
  const upiLink = "upi://pay?pa=8984330609@jupiteraxis&pn=TravoRents&am=" + newTotal + "&cu=INR&tn=TravoRents";
  const qrImg = document.getElementById("qrCodeImage");
  if (qrImg) {
    qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(upiLink);
  }

  // Update direct UPI Intent links for mobile users
  const qrLink = document.getElementById("qrLink");
  if (qrLink) qrLink.href = upiLink;

  const openUpiBtn = document.getElementById("openUpiAppBtn");
  if (openUpiBtn) openUpiBtn.href = upiLink;

  ["gpayBtn", "phonepeBtn", "paytmBtn", "bhimBtn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.href = upiLink;
  });
}

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
    if (payBtn) payBtn.innerHTML = '<i class="fa-solid fa-mobile-screen"></i> <span id="payBtnLabel">Open UPI App / Confirm Booking</span>';

    // Auto-launch UPI app on mobile if user clicks Scan QR Code tab
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const totPrice = document.getElementById("totalPrice") ? document.getElementById("totalPrice").innerText : "0";
      const upiLink = "upi://pay?pa=8984330609@jupiteraxis&pn=TravoRents&am=" + totPrice + "&cu=INR&tn=TravoRents";
      setTimeout(() => {
        window.location.href = upiLink;
      }, 300);
    }
  }
}

function makePayment(){
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

  // Show loading indicator on payment buttons
  const payBtn = document.querySelector(".payment-btn");
  const modalProceedBtn = document.getElementById("proceedBookingBtn");
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing Booking...';
  }
  if (modalProceedBtn) {
    modalProceedBtn.disabled = true;
    modalProceedBtn.innerText = "Processing...";
  }

  // Store customer details
  const currentBooking = JSON.parse(localStorage.getItem("booking")) || {};
  currentBooking.customerName = customerName;
  currentBooking.customerPhone = customerPhone;
  currentBooking.customerEmail = customerEmail;
  currentBooking.paymentId = paymentMethod === "online" ? "CASH_ON_VISIT" : "QR_PAYMENT";
  localStorage.setItem("booking", JSON.stringify(currentBooking));

  createBookingInDb(currentBooking).then((saved) => {
    if (saved && saved.booking_ref) {
      currentBooking.bookingRef = saved.booking_ref;
      localStorage.setItem("booking", JSON.stringify(currentBooking));
      
      if (paymentMethod === "online") {
        confirmCashBooking(currentBooking);
      } else {
        confirmQRBooking(currentBooking);
      }
    } else {
      console.warn("Backend server unreachable or timed out. Falling back to local checkout.");
      const offlineRef = "TR-" + Date.now();
      currentBooking.bookingRef = offlineRef;
      currentBooking.payment_status = paymentMethod === "online" ? "cash_on_visit" : "qr_pending";
      localStorage.setItem("booking", JSON.stringify(currentBooking));
      
      if (paymentMethod === "online") {
        window.location.href = `payment-success.html?ref=${offlineRef}&cash=1`;
      } else {
        window.location.href = `payment-success.html?ref=${offlineRef}&qr=1`;
      }
    }
  });
}

function createBookingInDb(bookingObj) {
  return fetchWithTimeout(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleName: bookingObj.vehicleName,
      vehicleImage: bookingObj.vehicleImage,
      amount: bookingObj.amount,
      transmission: bookingObj.transmission,
      fuel: bookingObj.fuel,
      seats: bookingObj.seats,
      pickupDate: bookingObj.pickupDate,
      pickupTime: bookingObj.pickupTime,
      returnDate: bookingObj.returnDate,
      returnTime: bookingObj.returnTime,
      location: bookingObj.location,
      customerName: bookingObj.customerName,
      customerPhone: bookingObj.customerPhone,
      customerEmail: bookingObj.customerEmail,
    }),
  }, 3500)
    .then((res) => res.json())
    .then((data) => (data.success ? data.booking : null))
    .catch((err) => {
      console.warn("Could not save booking to database (timed out or offline):", err);
      return null;
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
  sendBookingConfirmation(booking);
  
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    const totPrice = document.getElementById("totalPrice") ? document.getElementById("totalPrice").innerText : (booking.amount || "0");
    const upiLink = "upi://pay?pa=8984330609@jupiteraxis&pn=TravoRents&am=" + totPrice + "&cu=INR&tn=TravoRents";
    // Attempt launching UPI app intent chooser
    window.location.href = upiLink;
  }

  fetch(`${API_BASE}/api/confirm-qr-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingRef: booking.bookingRef
    })
  })
  .then(res => res.json())
  .then(data => {
    setTimeout(() => {
      window.location.href = `payment-success.html?ref=${booking.bookingRef}&qr=1`;
    }, isMobile ? 1200 : 0);
  })
  .catch(err => {
    console.error("QR Confirm Error:", err);
    setTimeout(() => {
      window.location.href = `payment-success.html?ref=${booking.bookingRef}&qr=1`;
    }, isMobile ? 1200 : 0);
  });
}

function confirmCashBooking(booking) {
  sendBookingConfirmation(booking);
  fetch(`${API_BASE}/api/confirm-cash-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingRef: booking.bookingRef
    })
  })
  .then(res => res.json())
  .then(data => {
    window.location.href = `payment-success.html?ref=${booking.bookingRef}&cash=1`;
  })
  .catch(err => {
    console.error("Cash Confirm Error:", err);
    window.location.href = `payment-success.html?ref=${booking.bookingRef}&cash=1`;
  });
}

function sendBookingConfirmation(booking) {
  const backendUrl = `${API_BASE}/api/send-whatsapp`;
  const totPrice = document.getElementById("totalPrice") ? document.getElementById("totalPrice").innerText : (booking.totalAmount || booking.amount || "0");
  
  const payload = {
    bookingId: booking.bookingRef || ("TR-" + Date.now()),
    vehicle: booking.vehicleName,
    amount: totPrice,
    customerName: booking.customerName || "Customer",
    customerPhone: booking.customerPhone || "",
    pickupDate: booking.pickupDate || "",
    pickupTime: booking.pickupTime || "",
    returnDate: booking.returnDate || "",
    returnTime: booking.returnTime || "",
    location: booking.location || "Bhubaneswar",
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
    console.log("Automatic WhatsApp notification sent to customer:", data);
  })
  .catch(err => {
    console.error("Error sending automatic WhatsApp:", err);
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

