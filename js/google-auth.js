// ═══════════════════════════════════════════════════════════════
// GOOGLE-AUTH.JS — Google Identity Services & OAuth Integration
// ═══════════════════════════════════════════════════════════════

// Default configured Client ID (or retrieved dynamically from localStorage)
let GOOGLE_CLIENT_ID = localStorage.getItem('GOOGLE_CLIENT_ID') || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function getGoogleClientId() {
  return localStorage.getItem('GOOGLE_CLIENT_ID') || GOOGLE_CLIENT_ID;
}

function setGoogleClientId(newId) {
  if (!newId) return;
  newId = newId.trim();
  localStorage.setItem('GOOGLE_CLIENT_ID', newId);
  GOOGLE_CLIENT_ID = newId;
}

// ─── Parse JWT without a library ──────────────
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// ─── Set button loading state ──────────────────
function setGoogleBtnLoading(loading) {
  const btns = document.querySelectorAll('.google-signin-btn');
  btns.forEach(btn => {
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
  });
}

// ─── Handle credential response from Google ───
function onGoogleCredentialResponse(response) {
  setGoogleBtnLoading(false);

  const payload = parseJwt(response.credential);
  if (!payload) {
    showToast('Google sign-in failed. Please try again.', 'error');
    return;
  }

  const { email, name, sub: googleId, picture } = payload;

  // Block admin-role emails from using Google sign-in
  const adminUser = getUsers().find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'admin'
  );
  if (adminUser) {
    showToast('Admins must use the Admin Portal to sign in.', 'warning');
    setTimeout(() => { window.location.href = 'admin-login.html'; }, 1200);
    return;
  }

  // Check if user already exists
  const existingUser = getUsers().find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    // ── Returning Google user: log in ──────────
    if (!existingUser.active) {
      showToast('Your account has been deactivated. Please contact support.', 'error');
      return;
    }
    setSession(existingUser);
    showToast(`Welcome back, ${existingUser.name}! 👋`, 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } else {
    // ── New user: auto-register via Google ─────
    const newUser = {
      id: genId('user'),
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      password: null,           // no password for OAuth users
      company: '',
      role: 'advertiser',
      active: true,
      createdAt: new Date().toISOString(),
      avatar: (name || email)[0].toUpperCase(),
      budget: 0,
      totalSpent: 0,
      googleId,
      picture: picture || null,
      authProvider: 'google'
    };

    addUser(newUser);
    setSession(newUser);
    showToast(`Account created! Welcome, ${newUser.name}! 🎉`, 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  }
}

// ─── Modal to prompt for Client ID if not yet configured ───
function showClientIdPromptModal() {
  const existing = document.getElementById('google-config-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'google-config-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;

  modal.innerHTML = `
    <div style="
      background: #1e293b; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px;
      max-width: 520px; width: 100%; padding: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      color: #f8fafc; font-family: 'Outfit', sans-serif;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-size:20px; font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
          🔑 Connect Google OAuth
        </h3>
        <button onclick="document.getElementById('google-config-modal').remove()" style="
          background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;
        ">✕</button>
      </div>

      <p style="font-size:14px; color:#94a3b8; line-height:1.5; margin-bottom:16px;">
        To enable Google Sign-In, enter your Google OAuth Client ID for project <b style="color:#60a5fa;">online-advertisement-optimiser</b>:
      </p>

      <div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:13px; color:#cbd5e1;">
        👉 <b>Quick Link:</b> <a href="https://console.cloud.google.com/apis/credentials/oauthclient?project=online-advertisement-optimiser" target="_blank" rel="noreferrer" style="color:#60a5fa; text-decoration:underline; font-weight:600;">Create OAuth Client ID in Google Cloud Console</a>
        <div style="margin-top:6px; font-size:12px; color:#94a3b8;">
          Choose <b>Web application</b> and add <code>${window.location.origin}</code> to <b>Authorized JavaScript origins</b>.
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:6px; color:#e2e8f0;">
          Google Client ID:
        </label>
        <input type="text" id="g_client_id_input" placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com" style="
          width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid #334155;
          border-radius: 8px; color: #fff; font-size: 13px; outline: none; font-family: monospace;
          box-sizing: border-box;
        " />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button onclick="document.getElementById('google-config-modal').remove()" style="
          padding: 10px 18px; background: transparent; border: 1px solid #475569;
          border-radius: 8px; color: #cbd5e1; font-size: 14px; cursor: pointer;
        ">Cancel</button>
        <button id="save_client_id_btn" style="
          padding: 10px 20px; background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
        ">Save & Sign In</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = document.getElementById('g_client_id_input');
  input.focus();

  document.getElementById('save_client_id_btn').addEventListener('click', () => {
    const val = input.value.trim();
    if (!val || !val.includes('.apps.googleusercontent.com')) {
      alert('Please enter a valid Client ID ending in .apps.googleusercontent.com');
      return;
    }
    setGoogleClientId(val);
    modal.remove();
    showToast('Client ID saved! Initializing Google Sign-In...', 'success');
    handleGoogleSignIn();
  });
}

// ─── Open Google One-Tap / Popup ──────────────
function handleGoogleSignIn() {
  const clientId = getGoogleClientId();

  if (!clientId || clientId.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
    showClientIdPromptModal();
    return;
  }

  setGoogleBtnLoading(true);

  if (typeof google === 'undefined' || !google.accounts) {
    showToast('Google Sign-In library is loading or blocked by ad-blocker.', 'error');
    setGoogleBtnLoading(false);
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: onGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback to standard prompt / rendering button
        const hiddenContainer = document.createElement('div');
        hiddenContainer.id = 'g_id_hidden_wrapper';
        hiddenContainer.style.display = 'none';
        document.body.appendChild(hiddenContainer);

        google.accounts.id.renderButton(hiddenContainer, { type: 'standard' });
        const btn = hiddenContainer.querySelector('div[role=button]');
        if (btn) {
          btn.click();
        }
        setGoogleBtnLoading(false);
      }
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    showToast('Error initializing Google Sign-In: ' + err.message, 'error');
    setGoogleBtnLoading(false);
  }
}

// ─── Auto-initialize One-Tap on page load ─────
window.addEventListener('load', () => {
  const clientId = getGoogleClientId();
  if (!clientId || clientId.startsWith('YOUR_GOOGLE_CLIENT_ID')) return;
  if (typeof google === 'undefined' || !google.accounts) return;

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: onGoogleCredentialResponse,
      auto_select: false
    });
    google.accounts.id.prompt();
  } catch (e) {
    console.warn('Google One-Tap auto-prompt suppressed:', e);
  }
});
