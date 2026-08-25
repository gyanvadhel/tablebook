/**
 * TableBook — Admin Auth
 * Handles login/logout and session checking for admin pages
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    // We're on the login page
    checkIfAlreadyLoggedIn();
    loginForm.addEventListener('submit', handleLogin);
  } else {
    // We're on a protected admin page
    checkAuth();
  }
});

async function checkIfAlreadyLoggedIn() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.authenticated) {
      window.location.href = '/admin/dashboard.html';
    }
  } catch (err) {
    // Not logged in, stay on login page
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login.html';
      return;
    }
    // Update sidebar user info
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = data.username;
    if (avatarEl) avatarEl.textContent = data.username.charAt(0).toUpperCase();
  } catch (err) {
    window.location.href = '/admin/login.html';
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  errorEl.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    // ignore
  }
  window.location.href = '/admin/login.html';
}

// Toast utility for admin pages
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
