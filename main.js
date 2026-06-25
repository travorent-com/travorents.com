// Base URL of the TravoRents backend (serves the API + the database).
const API_BASE = "http://127.0.0.1:3000";

const booking =
JSON.parse(localStorage.getItem("booking"));

if(!booking){
alert("No booking found");
window.location.href="index.html";
}

document.getElementById("vehicleName").innerText =
booking.vehicleName;

document.getElementById("vehicleImage").src =
booking.vehicleImage;

document.getElementById("pickupDate").innerText =
booking.pickupDate;

document.getElementById("returnDate").innerText =
booking.returnDate;

document.getElementById("pickupTime").innerText =
booking.pickupTime;

document.getElementById("returnTime").innerText =
booking.returnTime;

document.getElementById("pickupLocation").innerText =
booking.location;

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

document.getElementById("totalPrice").innerText =
total;

function makePayment(){
  // Get customer details from booking
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

  // Store customer details
  const booking = JSON.parse(localStorage.getItem("booking")) || {};
  booking.customerName = customerName;
  booking.customerPhone = customerPhone;
  booking.customerEmail = customerEmail;
  booking.paymentId = "pending";
  localStorage.setItem("booking", JSON.stringify(booking));

  // Create a booking record in the database now, before payment, so we
  // never lose the booking even if the customer abandons checkout.
  createBookingInDb(booking).then((saved) => {
    if (saved && saved.booking_ref) {
      booking.bookingRef = saved.booking_ref;
      localStorage.setItem("booking", JSON.stringify(booking));
    }
    openRazorpay(booking);
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

function openRazorpay(booking) {
  var options = {
    key: "rzp_test_T5X9hFgwLNRiar",
    amount: total * 100,
    currency: "INR",
    name: "TravoRents",
    description: "Vehicle Booking - " + booking.vehicleName,
    image: "mainlogo2.jpeg",
    prefill: {
      name: booking.customerName,
      email: booking.customerEmail,
      contact: booking.customerPhone
    },
    theme: {
      color: "#f7c948"
    },
    modal: {
      ondismiss: function() {
        alert("Payment cancelled");
      }
    },
    handler: function(response) {
      // Payment successful
      booking.paymentId = response.razorpay_payment_id;
      booking.orderId = response.razorpay_order_id || "manual";
      booking.signature = response.razorpay_signature || "";
      booking.paymentStatus = "completed";
      booking.paymentTime = new Date().toISOString();
      localStorage.setItem("booking", JSON.stringify(booking));

      // Mark the booking as paid in the database
      updateBookingInDb(booking.bookingRef, {
        paymentId: booking.paymentId,
        orderId: booking.orderId,
        paymentStatus: "completed",
      });

      // Send WhatsApp notification
      sendBookingConfirmation(booking);
      
      // Redirect to success page
      window.location.href = "payment-success.html";
    }
  };

  new Razorpay(options).open();
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