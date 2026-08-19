/**
 * ============================================================
 * MOCAR - Car/Bike Rental Bhubaneswar
 * JavaScript: mocar-script.js
 * ============================================================
 */

'use strict';

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/**
 * Select a single DOM element
 * @param {string} selector
 * @returns {Element|null}
 */
function $(selector) {
  return document.querySelector(selector);
}

/**
 * Select all matching DOM elements
 * @param {string} selector
 * @returns {NodeList}
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/* ============================================================
   NAVIGATION — HAMBURGER MENU
   ============================================================ */

const hamburger = $('#hamburger');
const navLinks  = $('#navLinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    // Swap icon between bars and X
    const icon = hamburger.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    }
  });

  // Close nav when any link is clicked
  $$('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const icon = hamburger.querySelector('i');
      if (icon) {
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
      }
    });
  });

  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
      const icon = hamburger.querySelector('i');
      if (icon) {
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
      }
    }
  });
}

/* ============================================================
   STICKY HEADER — shadow on scroll
   ============================================================ */

const header = $('header');

window.addEventListener('scroll', () => {
  if (!header) return;
  if (window.scrollY > 80) {
    header.style.boxShadow = '0 4px 30px rgba(0,0,0,0.15)';
  } else {
    header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
  }
});

/* ============================================================
   VEHICLE TABS — Cars / Bikes toggle
   ============================================================ */

const tabButtons = $$('.tab-btn');
const tabContents = $$('.tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;

    // Remove active from all buttons and contents
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    // Activate clicked button
    btn.classList.add('active');

    // Activate matching content
    const targetContent = $(`#tab-${targetTab}`);
    if (targetContent) {
      targetContent.classList.add('active');
      // Animate cards in
      targetContent.querySelectorAll('.vehicle-card').forEach((card, i) => {
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = `slideIn 0.4s ease ${i * 0.07}s both`;
      });
    }
  });
});

/* ============================================================
   BOOKING FORM — Find Vehicle
   ============================================================ */

const findVehicleBtn = $('#findVehicleBtn');

if (findVehicleBtn) {
  findVehicleBtn.addEventListener('click', () => {
    const vehicleType      = $('#vehicleType').value;
    const pickupLocation   = $('#pickupLocation').value;
    const pickupDate       = $('#pickupDate').value;
    const returnDate       = $('#returnDate').value;

    // Basic validation
    if (!vehicleType) {
      showAlert('Please select a vehicle type.', 'warning');
      return;
    }
    if (!pickupLocation) {
      showAlert('Please select a pickup location.', 'warning');
      return;
    }
    if (!pickupDate) {
      showAlert('Please select a pick-up date.', 'warning');
      return;
    }
    if (!returnDate) {
      showAlert('Please select a return date.', 'warning');
      return;
    }
    if (new Date(returnDate) < new Date(pickupDate)) {
      showAlert('Return date cannot be before pick-up date.', 'error');
      return;
    }

    // Scroll to vehicles section
    const vehiclesSection = $('#vehicles');
    if (vehiclesSection) {
      vehiclesSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Highlight vehicles matching the type
    const tabToActivate = vehicleType === 'bike' ? 'bikes' : 'cars';
    const matchingTab   = $(`.tab-btn[data-tab="${tabToActivate}"]`);
    if (matchingTab) {
      matchingTab.click();
    }

    showAlert(`Showing ${vehicleType} options for ${formatDate(pickupDate)} — ${formatDate(returnDate)}.`, 'success');
  });
}

/* ============================================================
   BOOK NOW BUTTONS
   ============================================================ */

document.addEventListener('click', (e) => {
  const bookBtn = e.target.closest('.book-btn');
  if (bookBtn) {
    const vehicleName = bookBtn.dataset.vehicle || 'this vehicle';
    showBookingModal(vehicleName);
  }
});

/**
 * Show a simple booking confirmation modal
 * @param {string} vehicleName
 */
function showBookingModal(vehicleName) {
  // Remove existing modal if any
  const existing = $('#mocar-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'mocar-modal';
  modal.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,0.6); display:flex;
    align-items:center; justify-content:center; padding:20px;
    animation:fadeInDown 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff; border-radius:20px; padding:40px;
      max-width:420px; width:100%; text-align:center;
      box-shadow:0 20px 60px rgba(0,0,0,0.3);
      animation:fadeInUp 0.3s ease;
    ">
      <div style="font-size:60px; margin-bottom:16px;">🚗</div>
      <h3 style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:12px;">
        Book ${vehicleName}
      </h3>
      <p style="color:#6c757d;font-size:14px;line-height:1.7;margin-bottom:24px;">
        To complete your booking, please call us or WhatsApp us directly. Our team is available 24/7!
      </p>
      <a href="tel:+919090610116" style="
        display:block; background:#e8261a; color:#fff;
        padding:14px; border-radius:12px; font-size:16px;
        font-weight:700; text-decoration:none; margin-bottom:12px;
        transition:all 0.3s ease;
      ">
        📞 Call: +91 9090610116
      </a>
      <a href="https://wa.me/919090610116?text=Hi, I want to book ${encodeURIComponent(vehicleName)}" target="_blank" style="
        display:block; background:#25D366; color:#fff;
        padding:14px; border-radius:12px; font-size:16px;
        font-weight:700; text-decoration:none; margin-bottom:20px;
      ">
        💬 WhatsApp Us
      </a>
      <button id="closeModal" style="
        background:none; border:2px solid #e9ecef; padding:10px 24px;
        border-radius:50px; font-size:14px; font-weight:600;
        color:#6c757d; cursor:pointer; transition:all 0.3s ease;
        font-family:'Poppins',sans-serif;
      ">
        Close
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  $('#closeModal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

/* ============================================================
   NEWSLETTER SUBSCRIPTION
   ============================================================ */

const subscribeBtn = $('#subscribeBtn');

if (subscribeBtn) {
  subscribeBtn.addEventListener('click', handleSubscribe);
}

// Also handle Enter key in newsletter input
const newsletterInput = $('#newsletterEmail');
if (newsletterInput) {
  newsletterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubscribe();
  });
}

function handleSubscribe() {
  const email = $('#newsletterEmail');
  if (!email) return;

  const value = email.value.trim();
  if (!value) {
    showAlert('Please enter your email address.', 'warning');
    return;
  }
  if (!isValidEmail(value)) {
    showAlert('Please enter a valid email address.', 'error');
    return;
  }

  showAlert('Thank you for subscribing! You\'ll receive the latest updates.', 'success');
  email.value = '';
}

/* ============================================================
   SCROLL ANIMATIONS — Intersection Observer
   ============================================================ */

const animatableElements = $$('.vehicle-card, .service-card, .why-card, .blog-card, .stat-item');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const el    = entry.target;
      const delay = (Array.from(el.parentElement.children).indexOf(el)) * 0.08;
      el.style.animation = `slideIn 0.5s ease ${delay}s both`;
      observer.unobserve(el);
    }
  });
}, { threshold: 0.1 });

animatableElements.forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});

/* ============================================================
   COUNTER ANIMATION — Stats Section
   ============================================================ */

const statNumbers = $$('.stat-item .number');

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      if (!isNaN(target)) {
        animateCounter(el, 0, target, 1800);
      }
      statsObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => statsObserver.observe(el));

/**
 * Animate a number counter from start to end
 * @param {Element} el
 * @param {number} start
 * @param {number} end
 * @param {number} duration  - ms
 */
function animateCounter(el, start, end, duration) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(start + (end - start) * eased);
    el.textContent = current.toLocaleString('en-IN') + '+';

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* ============================================================
   ALERT / TOAST NOTIFICATION
   ============================================================ */

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'warning'|'error'} type
 */
function showAlert(message, type = 'success') {
  // Remove existing toasts
  $$('.mocar-toast').forEach(t => t.remove());

  const colors = {
    success: '#2ed573',
    warning: '#ffa502',
    error:   '#e8261a',
  };

  const icons = {
    success: '✅',
    warning: '⚠️',
    error:   '❌',
  };

  const toast = document.createElement('div');
  toast.className = 'mocar-toast';
  toast.style.cssText = `
    position:fixed; bottom:100px; right:30px; z-index:10000;
    background:#fff; border-left:4px solid ${colors[type]};
    padding:16px 20px; border-radius:12px;
    box-shadow:0 8px 30px rgba(0,0,0,0.15);
    max-width:320px; font-family:'Poppins',sans-serif;
    display:flex; align-items:center; gap:12px;
    animation:fadeInRight 0.4s ease;
    font-size:14px; color:#1a1a2e; font-weight:500;
  `;

  toast.innerHTML = `
    <span style="font-size:20px;">${icons[type]}</span>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Auto-remove after 3.5s
  setTimeout(() => {
    toast.style.animation = 'fadeInRight 0.4s ease reverse';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* ============================================================
   SMOOTH SCROLL — anchor links
   ============================================================ */

$$('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href');
    if (targetId === '#' || targetId.length <= 1) return;

    const target = $(targetId);
    if (target) {
      e.preventDefault();
      const headerHeight = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ============================================================
   ACTIVE NAV LINK — highlight on scroll
   ============================================================ */

const sections   = $$('section[id]');
const navAnchors = $$('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    const top = sec.offsetTop - 120;
    if (window.scrollY >= top) {
      current = sec.id;
    }
  });

  navAnchors.forEach(a => {
    a.style.color = '';
    a.style.background = '';
    if (a.getAttribute('href') === `#${current}`) {
      a.style.color      = '#e8261a';
      a.style.background = 'rgba(232,38,26,0.07)';
    }
  });
});

/* ============================================================
   HELPER — Email Validation
   ============================================================ */

/**
 * Validate an email address
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ============================================================
   HELPER — Date Formatter
   ============================================================ */

/**
 * Format ISO date string to readable format
 * @param {string} dateStr  - e.g. "2024-08-20"
 * @returns {string}         - e.g. "20 Aug 2024"
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-IN', options);
}

/* ============================================================
   SCROLL TO TOP — clicking logo
   ============================================================ */

const logoEl = $('.logo-text');
if (logoEl) {
  logoEl.style.cursor = 'pointer';
  logoEl.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   INIT — set minimum dates for booking form
   ============================================================ */

(function initDates() {
  const today        = new Date().toISOString().split('T')[0];
  const pickupInput  = $('#pickupDate');
  const returnInput  = $('#returnDate');

  if (pickupInput)  pickupInput.setAttribute('min', today);
  if (returnInput)  returnInput.setAttribute('min', today);

  // When pickup date changes, update return min date
  if (pickupInput && returnInput) {
    pickupInput.addEventListener('change', () => {
      returnInput.setAttribute('min', pickupInput.value);
      if (returnInput.value && returnInput.value < pickupInput.value) {
        returnInput.value = pickupInput.value;
      }
    });
  }
})();

/* ============================================================
   VEHICLE CARD — image hover effect (CSS fallback via JS)
   ============================================================ */

$$('.vehicle-card').forEach(card => {
  const img = card.querySelector('.card-img');
  if (!img) return;

  card.addEventListener('mouseenter', () => {
    img.style.background = 'linear-gradient(135deg, #e8261a20, #e8261a40)';
  });

  card.addEventListener('mouseleave', () => {
    img.style.background = '';
  });
});

console.log('%cMOCAR 🚗 Website Loaded Successfully!', 'color:#e8261a;font-size:16px;font-weight:bold;');


function openTermsModal() {
  document.getElementById('termsModal').style.display = 'flex';
}

function closeTermsModal() {
  document.getElementById('termsModal').style.display = 'none';
}

function goToPaymentPage() {
  const agree = document.getElementById('agreeCheck');

  if (!agree.checked) {
    alert('Please agree to terms & conditions');
    return;
  }

  document.getElementById('termsModal').style.display = 'none';
  document.getElementById('bookingSummaryPage').style.display = 'none';
  document.getElementById('paymentPage').style.display = 'grid';
}

document.addEventListener('click', (e) => {
  const bookBtn = e.target.closest('.book-btn');

  if (bookBtn) {
    const vehicleName = bookBtn.dataset.vehicle || 'Vehicle';

    document.getElementById('selectedVehicleName').innerText = vehicleName;
    document.getElementById('bookingSummaryPage').style.display = 'grid';

    window.scrollTo({
      top: document.getElementById('bookingSummaryPage').offsetTop,
      behavior: 'smooth'
    });
  }
});
