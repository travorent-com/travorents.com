(function () {
  "use strict";

  const STORAGE_KEY = "travorentsPendingVehicle";
  const BUSINESS_WHATSAPP = "916372465107";
  let couponDiscount = 0;
  let lastBookingId = "";

  function byId(id) {
    return document.getElementById(id);
  }

  function dateValue(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + (offsetDays || 0));
    return date.toISOString().split("T")[0];
  }

  function currency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(value);
  }

  function formatTime(value) {
    if (!value) return "";
    const parts = value.split(":");
    const hour = Number(parts[0]);
    return String(hour % 12 || 12).padStart(2, "0") + ":" + parts[1] + (hour >= 12 ? " pm" : " am");
  }

  function setDefaults() {
    const location = byId("bkLocation");
    const pickupDate = byId("bkPickupDate");
    const returnDate = byId("bkReturnDate");
    const pickupTime = byId("bkPickupTime");
    const returnTime = byId("bkReturnTime");

    if (location && !location.value) location.value = "Nayapalli (Main Office)";
    if (pickupDate) {
      pickupDate.min = dateValue(0);
      if (!pickupDate.value) pickupDate.value = dateValue(0);
    }
    if (returnDate) {
      returnDate.min = pickupDate ? pickupDate.value : dateValue(0);
      if (!returnDate.value) returnDate.value = dateValue(1);
    }
    if (pickupTime && !pickupTime.value) pickupTime.value = "09:30";
    if (returnTime && !returnTime.value) returnTime.value = "09:30";

    if (pickupDate && returnDate) {
      pickupDate.addEventListener("change", function () {
        returnDate.min = pickupDate.value || dateValue(0);
        if (returnDate.value < returnDate.min) returnDate.value = returnDate.min;
      });
    }
  }

  function datesAreValid(showErrors) {
    const location = byId("bkLocation");
    const pickupDate = byId("bkPickupDate");
    const returnDate = byId("bkReturnDate");
    const pickupTime = byId("bkPickupTime");
    const returnTime = byId("bkReturnTime");

    if (location && !location.value) location.value = "Nayapalli (Main Office)";
    if (pickupDate && !pickupDate.value) pickupDate.value = dateValue(0);
    if (returnDate && !returnDate.value) returnDate.value = dateValue(1);
    if (pickupTime && !pickupTime.value) pickupTime.value = "09:30";
    if (returnTime && !returnTime.value) returnTime.value = "09:30";

    const pDate = pickupDate ? pickupDate.value : dateValue(0);
    const rDate = returnDate ? returnDate.value : dateValue(1);
    const pTime = pickupTime ? pickupTime.value : "09:30";
    const rTime = returnTime ? returnTime.value : "09:30";

    const pickup = new Date(pDate + "T" + pTime);
    const dropoff = new Date(rDate + "T" + rTime);
    if (dropoff <= pickup) {
      if (showErrors) showToast("Return time must be after pick-up time.", "error");
      return false;
    }
    return true;
  }

  function rentalDays() {
    const pDate = (byId("bkPickupDate") && byId("bkPickupDate").value) || dateValue(0);
    const pTime = (byId("bkPickupTime") && byId("bkPickupTime").value) || "09:30";
    const rDate = (byId("bkReturnDate") && byId("bkReturnDate").value) || dateValue(1);
    const rTime = (byId("bkReturnTime") && byId("bkReturnTime").value) || "09:30";
    const pickup = new Date(pDate + "T" + pTime);
    const dropoff = new Date(rDate + "T" + rTime);
    return Math.max(1, Math.ceil((dropoff - pickup) / 86400000));
  }

  window.findVehicle = function () {
    const vehicleTypeEl = byId("bkVehicleType");
    const type = vehicleTypeEl ? vehicleTypeEl.value : "car";
    if (!type) {
      showToast("Please choose vehicle type below or browse cars & bikes.", "info");
    }
    datesAreValid(false);

    const target = (type === "bike") ? "bikes" : "cars";
    const button = Array.from(document.querySelectorAll(".tab-btn")).find(function (item) {
      return item.textContent.toLowerCase().includes(target === "bikes" ? "bike" : "car");
    });
    if (button) switchTab(target, button);
    const vSec = byId("vehicles");
    if (vSec) vSec.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Selected " + (target === "bikes" ? "Bikes" : "Cars") + " fleet below.", "success");
  };

  window.openBookingSummary = function (name, image, amount, transmission, fuel, seats) {
    datesAreValid(false);

    currentVehicle = {
      name: name,
      image: image,
      p12: 0,
      p24: Number(amount),
      trans: transmission,
      fuel: fuel,
      seats: Number(seats)
    };
    couponDiscount = 0;

    const loc = (byId("bkLocation") && byId("bkLocation").value) || "Nayapalli (Main Office)";
    const pDate = (byId("bkPickupDate") && byId("bkPickupDate").value) || dateValue(0);
    const rDate = (byId("bkReturnDate") && byId("bkReturnDate").value) || dateValue(1);
    const pTime = (byId("bkPickupTime") && byId("bkPickupTime").value) || "09:30";
    const rTime = (byId("bkReturnTime") && byId("bkReturnTime").value) || "09:30";

    const booking = {
      vehicleName: name,
      vehicleImage: image,
      amount: Number(amount),
      transmission: transmission,
      fuel: fuel,
      seats: Number(seats),
      pickupDate: pDate,
      returnDate: rDate,
      pickupTime: pTime,
      returnTime: rTime,
      location: loc
    };

    localStorage.setItem("booking", JSON.stringify(booking));

    const summaryOverlay = byId("summaryOverlay");
    if (summaryOverlay) {
      if (byId("summVehicleImg")) byId("summVehicleImg").innerHTML = '<img src="' + image + '" alt="' + name.replace(/"/g, "&quot;") + '">';
      if (byId("summVehicleName")) byId("summVehicleName").textContent = name;
      if (byId("summTransmission")) byId("summTransmission").textContent = transmission;
      if (byId("summFuel")) byId("summFuel").textContent = fuel;
      if (byId("summSeats")) byId("summSeats").textContent = seats;
      if (byId("summPickupDate")) byId("summPickupDate").textContent = fmtDate(pDate);
      if (byId("summReturnDate")) byId("summReturnDate").textContent = fmtDate(rDate);
      if (byId("summPickupTime")) byId("summPickupTime").textContent = formatTime(pTime);
      if (byId("summReturnTime")) byId("summReturnTime").textContent = formatTime(rTime);
      if (byId("summLocationName")) byId("summLocationName").textContent = loc;
      if (byId("summKmLimit")) byId("summKmLimit").textContent = rentalDays() * 200 + " km";
      if (byId("couponInput")) byId("couponInput").value = "";

      calcTotal();
      summaryOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    } else {
      window.location.href = "booking-summary.html";
    }
  };

  window.calcTotal = function () {
    const days = datesAreValid(false) ? rentalDays() : 1;
    const base = (currentVehicle.p24 || 0) * days;
    const tax = base * 0.18;
    const subtotal = base + tax;
    const helmetBase = currentVehicle.seats === 2 ? 25 * days : 0;
    const helmetTax = helmetBase * 0.18;
    const helmetCharge = helmetBase + helmetTax;
    totalDue = Math.max(0, subtotal + helmetCharge - couponDiscount);

    byId("billingBase").textContent = currency(base);
    byId("billingTax").textContent = currency(tax);
    byId("billingSubtotal").textContent = currency(subtotal);
    byId("helmetBase").textContent = currency(helmetBase);
    byId("helmetTax").textContent = currency(helmetTax);
    byId("helmetSubtotal").textContent = currency(helmetCharge);
    byId("billingTotal").textContent = currency(totalDue);
  };

  window.applyCoupon = function () {
    const code = byId("couponInput").value.trim().toUpperCase();
    if (!code) {
      showToast("Enter a coupon code.", "warning");
      return;
    }
    if (code !== "TRAVO10") {
      couponDiscount = 0;
      calcTotal();
      showToast("That coupon code is not valid.", "error");
      return;
    }
    couponDiscount = currentVehicle.p24 * rentalDays() * 0.1;
    calcTotal();
    showToast("TRAVO10 applied: 10% off the rental charge.", "success");
  };

  window.openPayment = function () {
    closeModal();
    processPayment();
  };

  window.processPayment = function () {
    lastBookingId = "TR-" + Math.floor(100000 + Math.random() * 900000);
    const bookingRef = byId("bookingRef");
    if (bookingRef) bookingRef.textContent = lastBookingId;
    byId("summaryOverlay").classList.remove("active");
    document.body.style.overflow = "";
    showWAConfirmation(lastBookingId);
  };

  window.waMessage = function (bookingId) {
    return [
      "TravoRents booking request",
      "",
      "Booking ID: " + bookingId,
      "Vehicle: " + currentVehicle.name,
      "Pick-up: " + byId("summLocationName").textContent,
      "From: " + byId("summPickupDate").textContent + " at " + byId("summPickupTime").textContent,
      "To: " + byId("summReturnDate").textContent + " at " + byId("summReturnTime").textContent,
      "Estimated total: " + currency(totalDue),
      "",
      "Please confirm availability and the next steps."
    ].join("\n");
  };

  window.showWAConfirmation = function (bookingId) {
    const chatArea = byId("waChatArea");
    chatArea.querySelectorAll(".wa-recipient-group").forEach(function (element) {
      element.remove();
    });
    byId("waBookingSummaryText").textContent =
      bookingId + " | " + currentVehicle.name + " | " + currency(totalDue);
    byId("waDateStamp").textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    const group = document.createElement("div");
    group.className = "wa-recipient-group";
    group.innerHTML =
      '<div class="wa-recipient-tag">To TravoRents booking team</div>' +
      '<div class="wa-bubble">' + waMessage(bookingId).replace(/\n/g, "<br>") + "</div>";
    chatArea.appendChild(group);
    byId("waDot").className = "wa-dot done";
    byId("waStatusText").textContent = "Booking request is ready to send";
    byId("waSubtitle").textContent = "Review the request, then open WhatsApp";
    byId("waOverlay").classList.add("active");
  };

  window.openFirstWA = function () {
    window.open(
      "https://wa.me/" + BUSINESS_WHATSAPP + "?text=" + encodeURIComponent(waMessage(lastBookingId || "TR-PENDING")),
      "_blank",
      "noopener"
    );
  };

  function restoreFleetSelection() {
    let stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    } catch (_) {
      stored = null;
    }
    if (!stored || !stored.name || !stored.image || !stored.amount) return;

    sessionStorage.removeItem(STORAGE_KEY);
    byId("bkVehicleType").value =
      stored.seats === 2 ? "bike" : stored.transmission === "Automatic" ? "automatic" : "car";
    byId("bkLocation").value = "Nayapalli (Main Office)";
    setTimeout(function () {
      openBookingSummary(
        stored.name,
        stored.image,
        stored.amount,
        stored.transmission,
        stored.fuel || "Petrol",
        stored.seats
      );
    }, 50);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setDefaults();
    restoreFleetSelection();
    byId("signDate").textContent = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  // ═══════════════════════════════════════
  // MISSING FUNCTIONS - ADD HERE
  // ═══════════════════════════════════════

  // Global Variables
  window.currentVehicle = {};
  window.totalDue = 0;
  window.termsAgreed = false;
  window.docsAgreed = false;

  // Tab switching function
  window.switchTab = function (tabName, button) {
    const tabs = document.querySelectorAll(".tab-content");
    const buttons = document.querySelectorAll(".tab-btn");
    
    tabs.forEach(tab => tab.classList.remove("active"));
    buttons.forEach(btn => btn.classList.remove("active"));
    
    const activeTab = document.getElementById("tab-" + tabName);
    if (activeTab) activeTab.classList.add("active");
    if (button) button.classList.add("active");
  };

  // Toast notification function
  window.showToast = function (message, type) {
    type = type || "info";
    const toastContainer = document.getElementById("toastContainer") || createToastContainer();
    
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === "success" ? "#28a745" : type === "error" ? "#dc3545" : type === "warning" ? "#ffc107" : "#17a2b8"};
      color: ${type === "warning" ? "#000" : "#fff"};
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInUp 0.3s ease;
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
    return container;
  }

  // Format date function
  window.fmtDate = function (dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Close modal function
  window.closeModal = function () {
    const modal = byId("termsModal");
    if (modal) modal.classList.remove("active");
  };

  // Close overlay function
  window.closeOverlay = function (overlayId) {
    const overlay = byId(overlayId);
    if (overlay) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  };

  // Toggle mobile menu
  window.toggleMenu = function () {
    const nav = document.querySelector(".nav-links");
    if (nav) nav.classList.toggle("open");
  };

  // Check if user agreed to terms
  window.checkAgree = function () {
    const docCheck = byId("agreeDoc");
    const termsCheck = byId("agreeTerms");
    const proceedBtn = byId("proceedBtn");
    
    if (docCheck && termsCheck && proceedBtn) {
      proceedBtn.disabled = !(docCheck.checked && termsCheck.checked);
    }
  };

  // Back to summary from payment
  window.backToSummary = function () {
    closeOverlay("paymentOverlay");
    byId("summaryOverlay").classList.add("active");
  };

  // Open terms modal
  window.openTerms = function () {
    byId("termsModal").classList.add("active");
  };

  // Subscribe function
  window.subscribe = function () {
    const email = byId("nlEmail");
    if (email && email.value) {
      showToast("Thank you for subscribing!", "success");
      email.value = "";
    } else {
      showToast("Please enter a valid email address.", "warning");
    }
  };

  // Switch payment method
  window.switchPayMethod = function (method, element) {
    document.querySelectorAll(".pay-method-item").forEach(item => {
      item.classList.remove("active");
    });
    element.classList.add("active");
  };

  // Close WhatsApp modal
  window.closeWAModal = function () {
    byId("waOverlay").classList.remove("active");
  };

})();
