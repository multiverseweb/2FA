/**
 * 2FA Guard — Drop-in Email OTP Verification
 * Include this script on any page to require email OTP verification before access.
 *
 * Usage: <script src="https://YOUR-DOMAIN/static/js/2fa-guard.js"></script>
 *
 * The script auto-detects the service URL from its own src attribute.
 * All UI is self-contained — no external CSS required.
 */
(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────
  const STORAGE_KEY = "__2fa_guard_verified__";
  const SESSION_TTL = 0; // 0 = sessionStorage (cleared on tab close)

  // Auto-detect service URL from the script's src
  const scripts = document.getElementsByTagName("script");
  const currentScript = scripts[scripts.length - 1];
  const scriptSrc = currentScript.getAttribute("src") || "";
  const SERVICE_URL = scriptSrc.replace(/\/static\/js\/2fa-guard\.js.*$/, "");

  // ── Check if already verified ──────────────────────────────────────
  if (sessionStorage.getItem(STORAGE_KEY) === "true") {
    return; // Already verified, let the page load normally
  }

  // ── Hide the page ──────────────────────────────────────────────────
  const originalDisplay = document.documentElement.style.display;
  document.documentElement.style.visibility = "hidden";
  document.documentElement.style.overflow = "hidden";

  // ── Inject styles ──────────────────────────────────────────────────
  const OVERLAY_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    #__2fa_overlay__ {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #07070a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #e2e8f0;
      overflow: auto;
    }

    #__2fa_overlay__ * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Animated background */
    #__2fa_overlay__::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 600px 400px at 20% 30%, rgba(99,102,241,0.12) 0%, transparent 70%),
        radial-gradient(ellipse 500px 350px at 80% 70%, rgba(14,165,233,0.10) 0%, transparent 70%),
        radial-gradient(ellipse 400px 300px at 50% 50%, rgba(168,85,247,0.06) 0%, transparent 70%);
      animation: __2fa_bg_pulse 8s ease-in-out infinite alternate;
      pointer-events: none;
    }

    @keyframes __2fa_bg_pulse {
      0% { opacity: 0.6; transform: scale(1); }
      100% { opacity: 1; transform: scale(1.05); }
    }

    /* Card */
    .__2fa_card {
      position: relative;
      width: 100%;
      max-width: 420px;
      margin: 20px;
      padding: 40px 32px;
      background: rgba(15, 15, 25, 0.85);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 20px;
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.03),
        0 25px 50px rgba(0, 0, 0, 0.5),
        0 0 80px rgba(99, 102, 241, 0.06);
      animation: __2fa_card_enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
      transform: translateY(20px);
    }

    @keyframes __2fa_card_enter {
      to { opacity: 1; transform: translateY(0); }
    }

    /* Shield icon */
    .__2fa_icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(14,165,233,0.15));
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }

    .__2fa_title {
      text-align: center;
      font-size: 22px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }

    .__2fa_subtitle {
      text-align: center;
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 28px;
      line-height: 1.5;
    }

    /* Form elements */
    .__2fa_label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .__2fa_input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      color: #f1f5f9;
      font-size: 15px;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: all 0.2s ease;
    }

    .__2fa_input:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .__2fa_input::placeholder {
      color: #475569;
    }

    .__2fa_input_otp {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      text-align: center;
      letter-spacing: 0.3em;
      padding: 14px 16px;
    }

    .__2fa_btn {
      width: 100%;
      padding: 13px 20px;
      margin-top: 16px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }

    .__2fa_btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.35);
    }

    .__2fa_btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .__2fa_btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .__2fa_btn_secondary {
      background: transparent;
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      margin-top: 10px;
    }

    .__2fa_btn_secondary:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.08);
      box-shadow: none;
      transform: none;
    }

    /* Error message */
    .__2fa_error {
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      color: #fca5a5;
      font-size: 13px;
      text-align: center;
      animation: __2fa_shake 0.4s ease;
      display: none;
    }

    .__2fa_error.visible {
      display: block;
    }

    @keyframes __2fa_shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }

    /* Success */
    .__2fa_success {
      text-align: center;
      padding: 20px;
    }

    .__2fa_success_icon {
      font-size: 48px;
      margin-bottom: 16px;
      animation: __2fa_pop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes __2fa_pop {
      0% { transform: scale(0); }
      60% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    /* Timer */
    .__2fa_timer {
      text-align: center;
      margin-top: 14px;
      font-size: 13px;
      color: #64748b;
    }

    .__2fa_timer_value {
      font-family: 'JetBrains Mono', monospace;
      color: #a5b4fc;
      font-weight: 600;
    }

    .__2fa_timer_expired {
      color: #f87171;
    }

    /* Loading spinner */
    .__2fa_spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: __2fa_spin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }

    @keyframes __2fa_spin {
      to { transform: rotate(360deg); }
    }

    /* Powered by */
    .__2fa_powered {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #475569;
    }

    .__2fa_powered a {
      color: #6366f1;
      text-decoration: none;
    }

    .__2fa_powered a:hover {
      text-decoration: underline;
    }

    /* Hide step */
    .__2fa_hidden {
      display: none !important;
    }
  `;

  // ── Create overlay ─────────────────────────────────────────────────
  function createOverlay() {
    // Inject styles
    const style = document.createElement("style");
    style.textContent = OVERLAY_STYLES;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "__2fa_overlay__";

    overlay.innerHTML = `
      <div class="__2fa_card">
        <div class="__2fa_icon">🛡️</div>

        <!-- Step 1: Email -->
        <div id="__2fa_step_email">
          <h2 class="__2fa_title">Verification Required</h2>
          <p class="__2fa_subtitle">Enter your email to receive a one-time verification code</p>
          <label class="__2fa_label" for="__2fa_email_input">Email Address</label>
          <input
            class="__2fa_input"
            id="__2fa_email_input"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            autofocus
          />
          <div class="__2fa_error" id="__2fa_email_error"></div>
          <button class="__2fa_btn" id="__2fa_send_btn">Send Verification Code</button>
        </div>

        <!-- Step 2: OTP -->
        <div id="__2fa_step_otp" class="__2fa_hidden">
          <h2 class="__2fa_title">Enter Code</h2>
          <p class="__2fa_subtitle" id="__2fa_otp_subtitle">We sent a 6-digit code to your email</p>
          <label class="__2fa_label" for="__2fa_otp_input">Verification Code</label>
          <input
            class="__2fa_input __2fa_input_otp"
            id="__2fa_otp_input"
            type="text"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
          />
          <div class="__2fa_timer" id="__2fa_timer">
            Code expires in <span class="__2fa_timer_value" id="__2fa_timer_value">30</span>s
          </div>
          <div class="__2fa_error" id="__2fa_otp_error"></div>
          <button class="__2fa_btn" id="__2fa_verify_btn">Verify</button>
          <button class="__2fa_btn __2fa_btn_secondary" id="__2fa_resend_btn">Resend Code</button>
        </div>

        <!-- Step 3: Success -->
        <div id="__2fa_step_success" class="__2fa_hidden">
          <div class="__2fa_success">
            <div class="__2fa_success_icon">✅</div>
            <h2 class="__2fa_title">Verified!</h2>
            <p class="__2fa_subtitle">Redirecting you to the page...</p>
          </div>
        </div>

        <div class="__2fa_powered">
          Protected by <a href="${SERVICE_URL}" target="_blank" rel="noopener">2FA Guard</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  // ── State ──────────────────────────────────────────────────────────
  let currentEmail = "";
  let currentToken = "";
  let timerInterval = null;

  // ── API helpers ────────────────────────────────────────────────────
  async function apiSendOTP(email) {
    const res = await fetch(`${SERVICE_URL}/api/send-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json().then((data) => ({ ok: res.ok, status: res.status, ...data }));
  }

  async function apiVerifyOTP(email, otp, token) {
    const res = await fetch(`${SERVICE_URL}/api/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, token }),
    });
    return res.json().then((data) => ({ ok: res.ok, status: res.status, ...data }));
  }

  // ── Timer ──────────────────────────────────────────────────────────
  function startTimer() {
    let seconds = 30;
    const timerValue = document.getElementById("__2fa_timer_value");
    const timerEl = document.getElementById("__2fa_timer");

    clearInterval(timerInterval);
    timerValue.textContent = seconds;
    timerValue.classList.remove("__2fa_timer_expired");
    timerEl.innerHTML = `Code expires in <span class="__2fa_timer_value" id="__2fa_timer_value">${seconds}</span>s`;

    timerInterval = setInterval(() => {
      seconds--;
      const tv = document.getElementById("__2fa_timer_value");
      if (seconds <= 0) {
        clearInterval(timerInterval);
        timerEl.innerHTML = `<span class="__2fa_timer_expired">Code expired — request a new one</span>`;
      } else {
        if (tv) {
          tv.textContent = seconds;
          if (seconds <= 10) tv.classList.add("__2fa_timer_expired");
        }
      }
    }, 1000);
  }

  // ── Show error ─────────────────────────────────────────────────────
  function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.add("visible");
  }

  function hideError(elementId) {
    const el = document.getElementById(elementId);
    el.textContent = "";
    el.classList.remove("visible");
  }

  // ── Set button loading state ───────────────────────────────────────
  function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<span class="__2fa_spinner"></span>${text}`
      : text;
  }

  // ── Show page ──────────────────────────────────────────────────────
  function revealPage() {
    sessionStorage.setItem(STORAGE_KEY, "true");
    const overlay = document.getElementById("__2fa_overlay__");

    // Show success
    document.getElementById("__2fa_step_otp").classList.add("__2fa_hidden");
    document.getElementById("__2fa_step_success").classList.remove("__2fa_hidden");

    setTimeout(() => {
      overlay.style.transition = "opacity 0.4s ease";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        document.documentElement.style.visibility = "";
        document.documentElement.style.overflow = "";
      }, 400);
    }, 800);
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    const overlay = createOverlay();

    // Make page visible again (overlay covers it)
    document.documentElement.style.visibility = "";
    document.documentElement.style.overflow = "";

    const emailInput = document.getElementById("__2fa_email_input");
    const otpInput = document.getElementById("__2fa_otp_input");
    const sendBtn = document.getElementById("__2fa_send_btn");
    const verifyBtn = document.getElementById("__2fa_verify_btn");
    const resendBtn = document.getElementById("__2fa_resend_btn");
    const stepEmail = document.getElementById("__2fa_step_email");
    const stepOtp = document.getElementById("__2fa_step_otp");
    const otpSubtitle = document.getElementById("__2fa_otp_subtitle");

    // ── Send OTP ───────────────────────────────────────────────────
    async function handleSendOTP() {
      const email = emailInput.value.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        showError("__2fa_email_error", "Please enter a valid email address.");
        return;
      }

      hideError("__2fa_email_error");
      setLoading(sendBtn, true, "Sending...");

      try {
        const result = await apiSendOTP(email);
        if (result.ok) {
          currentEmail = email;
          currentToken = result.token;

          // Switch to OTP step
          stepEmail.classList.add("__2fa_hidden");
          stepOtp.classList.remove("__2fa_hidden");
          otpSubtitle.textContent = `We sent a 6-digit code to ${email}`;
          otpInput.focus();
          startTimer();
        } else {
          showError("__2fa_email_error", result.error || "Failed to send OTP.");
        }
      } catch (err) {
        showError("__2fa_email_error", "Network error. Please check your connection.");
      } finally {
        setLoading(sendBtn, false, "Send Verification Code");
      }
    }

    sendBtn.addEventListener("click", handleSendOTP);
    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSendOTP();
    });

    // ── Verify OTP ─────────────────────────────────────────────────
    async function handleVerifyOTP() {
      const otp = otpInput.value.trim();
      if (!otp || otp.length < 6) {
        showError("__2fa_otp_error", "Please enter the 6-digit code.");
        return;
      }

      hideError("__2fa_otp_error");
      setLoading(verifyBtn, true, "Verifying...");

      try {
        const result = await apiVerifyOTP(currentEmail, otp, currentToken);
        if (result.ok && result.verified) {
          clearInterval(timerInterval);
          revealPage();
        } else {
          showError("__2fa_otp_error", result.error || "Invalid OTP.");
          otpInput.value = "";
          otpInput.focus();
        }
      } catch (err) {
        showError("__2fa_otp_error", "Network error. Please try again.");
      } finally {
        setLoading(verifyBtn, false, "Verify");
      }
    }

    verifyBtn.addEventListener("click", handleVerifyOTP);
    otpInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleVerifyOTP();
    });

    // Only allow digits in OTP input
    otpInput.addEventListener("input", () => {
      otpInput.value = otpInput.value.replace(/\D/g, "");
    });

    // ── Resend OTP ─────────────────────────────────────────────────
    resendBtn.addEventListener("click", async () => {
      hideError("__2fa_otp_error");
      setLoading(resendBtn, true, "Resending...");

      try {
        const result = await apiSendOTP(currentEmail);
        if (result.ok) {
          currentToken = result.token;
          otpInput.value = "";
          otpInput.focus();
          startTimer();
        } else {
          showError("__2fa_otp_error", result.error || "Failed to resend OTP.");
        }
      } catch (err) {
        showError("__2fa_otp_error", "Network error. Please try again.");
      } finally {
        setLoading(resendBtn, false, "Resend Code");
      }
    });
  }

  // ── Bootstrap ──────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
