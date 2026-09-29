// ═══════════════════════════════════════════
// JS/API-CLIENT.JS
// Frontend API helper — replaces LocalStorage auth calls.
// Sends requests to the Express backend with credentials (cookies).
//
// Usage: include this script BEFORE auth.js in your HTML pages.
// Then call window.ApiClient.login(email, password) etc.
// ═══════════════════════════════════════════

const ApiClient = (() => {
  // Change to your deployed backend URL when going to production
  const BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://YOUR_DEPLOYED_BACKEND_URL';

  async function request(method, path, body = null) {
    const options = {
      method,
      credentials: 'include', // Send HttpOnly cookie automatically
      headers: {}
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);

    let data;
    try {
      data = await response.json();
    } catch {
      data = { success: false, message: 'Server returned an invalid response.' };
    }

    if (!response.ok && !data.success) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  }

  // ── Auth ───────────────────────────────────
  async function register(name, email, password, company = '') {
    return request('POST', '/api/auth/register', { name, email, password, company });
  }

  async function login(email, password) {
    return request('POST', '/api/auth/login', { email, password });
  }

  async function logout() {
    return request('POST', '/api/auth/logout');
  }

  async function getMe() {
    return request('GET', '/api/auth/me');
  }

  async function updateProfile(updates) {
    return request('PATCH', '/api/auth/profile', updates);
  }

  // ── Campaigns (authenticated) ───────────────
  async function getCampaigns() {
    return request('GET', '/api/campaigns');
  }

  async function getCampaignStats() {
    return request('GET', '/api/campaigns/stats');
  }

  async function getCampaign(id) {
    return request('GET', `/api/campaigns/${id}`);
  }

  async function createCampaign(data) {
    return request('POST', '/api/campaigns', data);
  }

  async function updateCampaign(id, data) {
    return request('PATCH', `/api/campaigns/${id}`, data);
  }

  async function deleteCampaign(id) {
    return request('DELETE', `/api/campaigns/${id}`);
  }

  // ── Admin ───────────────────────────────────
  async function adminGetStats() {
    return request('GET', '/api/admin/stats');
  }

  async function adminGetUsers() {
    return request('GET', '/api/admin/users');
  }

  async function adminSetUserStatus(userId, status) {
    return request('PATCH', `/api/admin/users/${userId}/status`, { status });
  }

  async function adminSetUserRole(userId, role) {
    return request('PATCH', `/api/admin/users/${userId}/role`, { role });
  }

  async function adminGetCampaigns() {
    return request('GET', '/api/admin/campaigns');
  }

  async function adminApproveCampaign(id) {
    return request('PATCH', `/api/admin/campaigns/${id}/approve`);
  }

  async function adminRejectCampaign(id, reason = '') {
    return request('PATCH', `/api/admin/campaigns/${id}/reject`, { reason });
  }

  async function adminGetSettings() {
    return request('GET', '/api/admin/settings');
  }

  async function adminUpdateSettings(settings) {
    return request('PATCH', '/api/admin/settings', settings);
  }

  async function adminGetComplaints() {
    return request('GET', '/api/admin/complaints');
  }

  async function adminUpdateComplaint(id, status) {
    return request('PATCH', `/api/admin/complaints/${id}`, { status });
  }

  return {
    register, login, logout, getMe, updateProfile,
    getCampaigns, getCampaignStats, getCampaign,
    createCampaign, updateCampaign, deleteCampaign,
    adminGetStats, adminGetUsers, adminSetUserStatus, adminSetUserRole,
    adminGetCampaigns, adminApproveCampaign, adminRejectCampaign,
    adminGetSettings, adminUpdateSettings, adminGetComplaints, adminUpdateComplaint
  };
})();

window.ApiClient = ApiClient;
