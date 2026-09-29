// ═══════════════════════════════════════════
// GOOGLE-AUTH.JS — Google Identity Services
// ═══════════════════════════════════════════
//
//  ⚠️  ACTION REQUIRED:
//  Replace the placeholder below with your real
//  Google OAuth Client ID from Google Cloud Console.
//
//  How to get one:
//  1. Go to https://console.cloud.google.com/
//  2. Create or select a project
//  3. Navigate to APIs & Services → Credentials
//  4. Click "Create Credentials" → "OAuth client ID"
//  5. Choose "Web application"
//  6. Under "Authorized JavaScript origins" add:
//       http://localhost:5173   (Vite dev server)
//       http://localhost:3000   (if using another port)
//       https://your-production-domain.com
//  7. Copy the "Client ID" and paste it below.
//
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

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

// ─── Open Google One-Tap / Popup ──────────────
function handleGoogleSignIn() {
  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    showToast(
      '⚠️ Google Client ID not configured. Open js/google-auth.js and replace the placeholder.',
      'warning'
    );
    return;
  }

  setGoogleBtnLoading(true);

  // Initialize GIS client and trigger popup flow
  if (typeof google === 'undefined' || !google.accounts) {
    showToast('Google Sign-In library not loaded. Check your internet connection.', 'error');
    setGoogleBtnLoading(false);
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'openid email profile',
    callback: () => {}  // not used for id_token flow
  });

  // Use the id_token (credential) flow instead
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true
  });

  google.accounts.id.prompt(notification => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // One-Tap not available — fall back to popup
      google.accounts.id.renderButton(
        document.createElement('div'),   // hidden container
        { type: 'standard' }
      );
      // Trigger the popup manually
      const hiddenBtn = document.querySelector('.g_id_signin button');
      if (hiddenBtn) hiddenBtn.click();
      setGoogleBtnLoading(false);
    }
  });
}

// ─── Auto-initialize One-Tap on page load ─────
window.addEventListener('load', () => {
  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') return;
  if (typeof google === 'undefined' || !google.accounts) return;

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredentialResponse,
    auto_select: false
  });

  // Show One-Tap prompt automatically
  google.accounts.id.prompt();
});
