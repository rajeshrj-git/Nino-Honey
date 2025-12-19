// auth.js
// Simple authentication system for reports page

const AUTH_KEY = 'Liams_reports_auth';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Admin credentials (In production, use backend authentication)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Liams2025'
};

// Check if user is authenticated
function isAuthenticated() {
  const authData = localStorage.getItem(AUTH_KEY);
  
  if (!authData) {
    return false;
  }
  
  try {
    const { timestamp } = JSON.parse(authData);
    const now = new Date().getTime();
    
    // Check if session has expired
    if (now - timestamp > SESSION_DURATION) {
      logout();
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Login function
function login(username, password) {
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const authData = {
      username: username,
      timestamp: new Date().getTime()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    return true;
  }
  return false;
}

// Logout function
function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = './login.html';
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = './login.html';
  }
}

// Get logged in username
function getLoggedInUser() {
  const authData = localStorage.getItem(AUTH_KEY);
  if (authData) {
    try {
      const { username } = JSON.parse(authData);
      return username;
    } catch (error) {
      return null;
    }
  }
  return null;
}
