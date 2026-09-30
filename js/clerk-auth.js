// ═══════════════════════════════════════════
// CLERK-AUTH.JS
// Bridges Clerk authentication → existing localStorage session
// ═══════════════════════════════════════════

const CLERK_PUBLISHABLE_KEY = 'pk_test_YWxlcnQtamF5LTI5NTcuY2xlcmsuYWNjb3VudHMuZGV2JA';

// ── Sync Clerk user → existing localStorage session ─────────────────────────
// The rest of the app uses getSession() / session.userId, so we keep that
// working by writing a matching user record after Clerk signs someone in.
function syncClerkToSession(clerkUser) {
  if (!clerkUser) { clearSession(); return null; }

  const email = (clerkUser.primaryEmailAddress && clerkUser.primaryEmailAddress.emailAddress) || '';
  const name  = clerkUser.fullName || clerkUser.firstName || email.split('@')[0] || 'User';

  initDB();
  const db = getDB();
  if (!db.users) db.users = [];

  // Find existing record by email
  let user = db.users.find(function(u) {
    return u.email.toLowerCase() === email.toLowerCase();
  });

  if (!user) {
    // First-time Clerk sign-in: create a local user record
    user = {
      id:         'clerk_' + clerkUser.id,
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      password:   '',
      company:    '',
      role:       'advertiser',
      active:     true,
      createdAt:  new Date().toISOString(),
      avatar:     name[0] ? name[0].toUpperCase() : '?',
      budget:     0,
      totalSpent: 0,
      clerkId:    clerkUser.id,
    };
    db.users.push(user);
    saveDB(db);
  }

  setSession(user);
  return user;
}

// ── INDEX.HTML: mount SignIn & SignUp components ──────────────────────────────
async function initClerkSignIn() {
  var clerk = window.Clerk;
  await clerk.load();

  // Already authenticated → go straight to dashboard
  if (clerk.user) {
    syncClerkToSession(clerk.user);
    window.location.href = 'dashboard.html';
    return;
  }

  var signInEl  = document.getElementById('clerk-sign-in');
  var signUpEl  = document.getElementById('clerk-sign-up');

  var darkAppearance = {
    elements: {
      card: 'clerk-dark-card',
      headerTitle: 'clerk-dark-title',
      headerSubtitle: 'clerk-dark-sub',
      socialButtonsBlockButton: 'clerk-dark-social-btn',
      socialButtonsBlockButtonText: 'clerk-dark-social-text',
      formFieldLabel: 'clerk-dark-label',
      formFieldInput: 'clerk-dark-input',
      formButtonPrimary: 'clerk-dark-primary-btn',
      footerActionLink: 'clerk-dark-link',
      dividerLine: 'clerk-dark-divider',
      dividerText: 'clerk-dark-divider-text'
    }
  };

  if (signInEl) {
    clerk.mountSignIn(signInEl, { appearance: darkAppearance, afterSignInUrl: 'dashboard.html' });
  }
  if (signUpEl) {
    clerk.mountSignUp(signUpEl, { appearance: darkAppearance, afterSignUpUrl: 'dashboard.html' });
  }

  // Remove any dynamic phone number fields injected by Clerk
  var removePhoneFields = function() {
    var phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone"], .cl-phoneInput, [data-field*="phone"]');
    phoneInputs.forEach(function(el) {
      var container = el.closest('.cl-formField') || el.closest('.cl-formFieldRow') || el.parentElement;
      if (container) container.style.display = 'none';
    });
  };

  removePhoneFields();
  var observer = new MutationObserver(removePhoneFields);
  if (signUpEl) observer.observe(signUpEl, { childList: true, subtree: true });
  if (signInEl) observer.observe(signInEl, { childList: true, subtree: true });

  // Keep local session in sync as auth state changes
  clerk.addListener(function(resources) {
    if (resources.user) syncClerkToSession(resources.user);
  });
}

// Tab switcher for index.html (Sign In / Create Account)
function clerkSwitchTab(tab) {
  var loginEl    = document.getElementById('clerk-sign-in');
  var registerEl = document.getElementById('clerk-sign-up');
  var tabLogin   = document.getElementById('tab-login');
  var tabReg     = document.getElementById('tab-register');

  if (loginEl)    loginEl.style.display    = tab === 'login'    ? '' : 'none';
  if (registerEl) registerEl.style.display = tab === 'register' ? '' : 'none';

  if (tabLogin) {
    tabLogin.classList.toggle('active', tab === 'login');
    tabLogin.setAttribute('aria-selected', String(tab === 'login'));
  }
  if (tabReg) {
    tabReg.classList.toggle('active', tab === 'register');
    tabReg.setAttribute('aria-selected', String(tab === 'register'));
  }
}

// ── DASHBOARD.HTML: guard route + mount UserButton ────────────────────────────
async function initClerkDashboard() {
  var clerk = window.Clerk;
  await clerk.load();

  if (!clerk.user) {
    // Session expired or user signed out in another tab
    clearSession();
    window.location.href = 'index.html';
    return;
  }

  // Keep local session fresh with Clerk data
  syncClerkToSession(clerk.user);

  // Mount UserButton (avatar + profile + sign-out) in sidebar footer
  var ubEl = document.getElementById('clerk-user-button');
  if (ubEl) {
    clerk.mountUserButton(ubEl, { afterSignOutUrl: 'index.html' });
  }

  // Handle sign-out from Clerk (e.g. from another tab or the UserButton)
  clerk.addListener(function(resources) {
    if (!resources.user) {
      clearSession();
      window.location.href = 'index.html';
    }
  });
}

// Programmatic sign-out — replaces logoutUser() on pages using Clerk
async function clerkSignOut() {
  if (window.Clerk && window.Clerk.user) {
    await window.Clerk.signOut();
  }
  clearSession();
  window.location.href = 'index.html';
}
