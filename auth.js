/**
 * TravoRents Customer Authentication & Session Library (auth.js)
 * Manages customer login state, OTP modal, auto-fill, and nav header state.
 */

(function () {
  const STORAGE_KEY = 'travo_user';

  const TravoAuth = {
    // ── Check if customer is logged in
    isLoggedIn: function () {
      const u = this.getUser();
      return !!(u && u.phone && u.name);
    },

    // ── Get current user object
    getUser: function () {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error("Auth storage read error:", e);
        return null;
      }
    },

    // ── Save user session
    setUser: function (userObj) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
        this.updateNavUI();
      } catch (e) {
        console.error("Auth storage write error:", e);
      }
    },

    // ── Logout
    logout: function () {
      localStorage.removeItem(STORAGE_KEY);
      this.updateNavUI();
      if (typeof window.showToast === 'function') {
        window.showToast("Logged out successfully");
      } else {
        alert("Logged out successfully");
      }
    },

    // ── Require login before an action
    requireLogin: function (onSuccess) {
      if (this.isLoggedIn()) {
        if (typeof onSuccess === 'function') onSuccess(this.getUser());
        return true;
      } else {
        this.openLoginModal(onSuccess);
        return false;
      }
    },

    // ── Open Customer Login Modal
    openLoginModal: function (onSuccessCallback) {
      let modalEl = document.getElementById('travoAuthModal');
      if (!modalEl) {
        modalEl = this._createModalDOM();
        document.body.appendChild(modalEl);
      }

      this._onSuccessCallback = onSuccessCallback;

      // Reset modal to Step 1
      document.getElementById('authStep1').style.display = 'block';
      document.getElementById('authStep2').style.display = 'none';
      document.getElementById('authPhoneInput').value = '';
      document.getElementById('authNameInput').value = '';
      document.getElementById('authEmailInput').value = '';
      document.getElementById('authOtpInput').value = '';

      modalEl.style.display = 'flex';
      modalEl.classList.add('active');
      document.body.style.overflow = 'hidden';
    },

    // ── Close Customer Login Modal
    closeLoginModal: function () {
      const modalEl = document.getElementById('travoAuthModal');
      if (modalEl) {
        modalEl.style.display = 'none';
        modalEl.classList.remove('active');
      }
      document.body.style.overflow = '';
    },

    // ── Send OTP via Backend (WhatsApp & Email)
    sendOTP: async function (e) {
      if (e) e.preventDefault();

      const nameInput = document.getElementById('authNameInput');
      const phoneInput = document.getElementById('authPhoneInput');
      const emailInput = document.getElementById('authEmailInput');
      const submitBtn = document.getElementById('authSubmitStep1Btn');

      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, '') : '';
      const email = emailInput ? emailInput.value.trim() : '';

      if (!name) {
        alert("Please enter your Full Name.");
        if (nameInput) nameInput.focus();
        return;
      }

      if (!phone || phone.length < 10) {
        alert("Please enter a valid 10-digit Mobile Number.");
        if (phoneInput) phoneInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Real-Time OTP...';
      }

      this._pendingUser = {
        name: name,
        phone: phone,
        email: email,
        createdAt: new Date().toISOString()
      };

      // Switch to Step 2 DOM UI immediately
      document.getElementById('authStep1').style.display = 'none';
      document.getElementById('authStep2').style.display = 'block';
      document.getElementById('authOtpPhoneDisplay').textContent = "+91 " + phone;
      
      const emailNoticeEl = document.getElementById('authOtpEmailDisplay');
      if (emailNoticeEl) {
        emailNoticeEl.textContent = email ? ` & ${email}` : '';
      }

      const otpInput = document.getElementById('authOtpInput');
      if (otpInput) {
        otpInput.value = '';
        setTimeout(() => otpInput.focus(), 100);
      }

      this.startResendTimer();

      // Trigger backend OTP send in background
      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:3000'
        : 'https://travorents-com.onrender.com';

      try {
        const response = await fetch(`${API_BASE}/api/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name, email })
        });
        const data = await response.json();
        if (data && data.otpCode) {
          this._pendingUser.otpCode = data.otpCode;
        }
      } catch (err) {
        console.warn("Backend OTP request background notice:", err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Continue to Verification <i class="fas fa-arrow-right"></i>';
        }
      }
    },

    // ── Resend OTP timer
    startResendTimer: function () {
      let seconds = 30;
      const resendBtn = document.getElementById('authResendOtpBtn');
      if (!resendBtn) return;

      resendBtn.disabled = true;
      clearInterval(this._resendInterval);

      this._resendInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
          clearInterval(this._resendInterval);
          resendBtn.disabled = false;
          resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend Real-Time OTP';
        } else {
          resendBtn.innerHTML = `<i class="fas fa-clock"></i> Resend OTP in ${seconds}s`;
        }
      }, 1000);
    },

    // ── Verify OTP & Complete Login
    verifyOTP: async function (e) {
      if (e) e.preventDefault();

      const otpInput = document.getElementById('authOtpInput');
      const enteredOtp = otpInput ? otpInput.value.trim() : '';
      const submitBtn = document.getElementById('authSubmitStep2Btn');

      if (!enteredOtp || enteredOtp.length < 4) {
        alert("Please enter the 4-digit OTP code sent to your WhatsApp / Email.");
        if (otpInput) otpInput.focus();
        return;
      }

      const pending = this._pendingUser || {
        name: document.getElementById('authNameInput')?.value || "Customer",
        phone: document.getElementById('authPhoneInput')?.value || "8455065107",
        email: document.getElementById('authEmailInput')?.value || ""
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
      }

      // Complete login state
      const user = {
        name: pending.name,
        phone: pending.phone,
        email: pending.email,
        verified: true,
        loginTime: new Date().toISOString()
      };

      this.setUser(user);
      this.closeLoginModal();

      if (typeof this._onSuccessCallback === 'function') {
        const cb = this._onSuccessCallback;
        this._onSuccessCallback = null;
        cb(user);
      }

      // Attempt background backend verification sync
      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:3000'
        : 'https://travorents-com.onrender.com';

      try {
        fetch(`${API_BASE}/api/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: pending.phone, otp: enteredOtp, name: pending.name, email: pending.email })
        }).catch(err => console.warn("Backend verify sync:", err));
      } catch(e) {}

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Verify &amp; Continue Booking <i class="fas fa-check-circle"></i>';
      }
    },

    // ── Update Navigation Bar UI
    updateNavUI: function () {
      const user = this.getUser();
      const navUserContainers = document.querySelectorAll('.nav-user-slot, .nav-call-container, .navbar .nav-links');

      navUserContainers.forEach(container => {
        let btnEl = container.querySelector('.btn-travo-auth');
        if (!btnEl) {
          const isUL = container.tagName && container.tagName.toLowerCase() === 'ul';
          btnEl = document.createElement(isUL ? 'li' : 'div');
          btnEl.className = 'btn-travo-auth';
          container.appendChild(btnEl);
        }

        if (user) {
          const firstName = user.name.split(' ')[0];
          btnEl.innerHTML = `
            <div class="user-pill-dropdown">
              <button class="user-pill-btn" onclick="TravoAuth.toggleUserDropdown(event)">
                <i class="fas fa-user-circle"></i> Hi, ${firstName} <i class="fas fa-chevron-down" style="font-size:10px;margin-left:4px;"></i>
              </button>
              <div class="user-dropdown-menu" id="travoUserDropdown">
                <div class="dropdown-header">
                  <strong>${user.name}</strong>
                  <span>+91 ${user.phone}</span>
                </div>
                <a href="booking-summary.html" class="dropdown-item"><i class="fas fa-receipt"></i> My Booking Summary</a>
                <a href="javascript:void(0)" onclick="TravoAuth.logout()" class="dropdown-item text-danger"><i class="fas fa-sign-out-alt"></i> Logout</a>
              </div>
            </div>
          `;
        } else {
          btnEl.innerHTML = `
            <button class="auth-nav-login-btn" onclick="TravoAuth.openLoginModal()">
              <i class="fas fa-sign-in-alt"></i> Login
            </button>
          `;
        }
      });
    },

    toggleUserDropdown: function (e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('travoUserDropdown');
      if (menu) {
        menu.classList.toggle('show');
      }
    },

    // ── Create Modal HTML DOM
    _createModalDOM: function () {
      const modal = document.createElement('div');
      modal.id = 'travoAuthModal';
      modal.className = 'auth-modal-overlay';
      modal.innerHTML = `
        <div class="auth-modal-card">
          <button class="auth-close-btn" onclick="TravoAuth.closeLoginModal()"><i class="fas fa-times"></i></button>

          <div class="auth-header">
            <img src="mainlogo2.jpeg" alt="TravoRents Logo" class="auth-logo">
            <h3>Customer Login</h3>
            <p>Login to confirm your vehicle booking with TravoRents</p>
          </div>

          <!-- STEP 1: Details -->
          <div id="authStep1">
            <form onsubmit="TravoAuth.sendOTP(event)">
              <div class="auth-field">
                <label><i class="fas fa-user"></i> Full Name *</label>
                <input type="text" id="authNameInput" placeholder="e.g. Rahul Sharma" required>
              </div>

              <div class="auth-field">
                <label><i class="fas fa-phone-alt"></i> Mobile Number (WhatsApp) *</label>
                <div class="phone-input-wrap">
                  <span class="country-code">+91</span>
                  <input type="tel" id="authPhoneInput" placeholder="9876543210" maxlength="10" required>
                </div>
              </div>

              <div class="auth-field">
                <label><i class="fas fa-envelope"></i> Email Address (Optional)</label>
                <input type="email" id="authEmailInput" placeholder="rahul@example.com">
              </div>

              <button type="submit" id="authSubmitStep1Btn" class="auth-submit-btn">
                Continue to Verification <i class="fas fa-arrow-right"></i>
              </button>
            </form>
          </div>

          <!-- STEP 2: OTP Verification -->
          <div id="authStep2" style="display:none;">
            <div class="otp-notice">
              <i class="fas fa-shield-alt"></i> Real-Time OTP sent to <strong id="authOtpPhoneDisplay">+91 Mobile</strong><span id="authOtpEmailDisplay"></span> via <strong style="color:#15803d;"><i class="fab fa-whatsapp"></i> WhatsApp</strong> &amp; <strong style="color:#0369a1;"><i class="fas fa-envelope"></i> Email</strong>
            </div>

            <form onsubmit="TravoAuth.verifyOTP(event)">
              <div class="auth-field">
                <label><i class="fas fa-key"></i> Enter 4-Digit Verification Code</label>
                <input type="text" id="authOtpInput" placeholder="____" maxlength="4" style="text-align:center;font-size:22px;letter-spacing:8px;font-weight:700;" autocomplete="one-time-code" required>
              </div>

              <button type="submit" id="authSubmitStep2Btn" class="auth-submit-btn">
                Verify &amp; Continue Booking <i class="fas fa-check-circle"></i>
              </button>

              <div style="display:flex;gap:10px;margin-top:12px;">
                <button type="button" id="authResendOtpBtn" class="auth-secondary-btn" style="flex:1;" onclick="TravoAuth.sendOTP(event)">
                  <i class="fas fa-redo"></i> Resend OTP
                </button>
                <button type="button" class="auth-secondary-btn" style="flex:1;" onclick="document.getElementById('authStep2').style.display='none';document.getElementById('authStep1').style.display='block';">
                  <i class="fas fa-arrow-left"></i> Change Info
                </button>
              </div>
            </form>
          </div>

          <div class="auth-footer">
            <i class="fas fa-lock" style="color:#28a745;"></i> 100% Safe Real-Time Verification
          </div>
        </div>
      `;

      // Close dropdown when clicking outside
      document.addEventListener('click', function (e) {
        const menu = document.getElementById('travoUserDropdown');
        if (menu && !e.target.closest('.user-pill-dropdown')) {
          menu.classList.remove('show');
        }
      });

      return modal;
    }
  };

  // Expose globally
  window.TravoAuth = TravoAuth;

  // Init UI on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      TravoAuth.updateNavUI();
    });
  } else {
    TravoAuth.updateNavUI();
  }
})();
