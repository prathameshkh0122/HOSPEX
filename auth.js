/* HOSPEX shared auth/session helper — used across index.html, list-resource.html,
   business-registration.html and admin-dashboard.html. */
(function (global) {
  "use strict";

  const API = "/api/v1";
  const TOKEN_KEY = "hospex_token";
  const USER_KEY = "hospex_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch (_e) { return null; }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function isAdmin() {
    const user = getUser();
    return Boolean(user && user.role === "admin");
  }

  // `body` may be a plain object (sent as JSON) or a FormData instance
  // (sent as-is, e.g. for file uploads).
  async function apiFetch(path, options) {
    const config = options || {};
    const headers = Object.assign({}, config.headers || {});
    const isFormData = typeof FormData !== "undefined" && config.body instanceof FormData;
    if (!isFormData && config.body && typeof config.body !== "string") {
      config.body = JSON.stringify(config.body);
      headers["Content-Type"] = "application/json";
    } else if (!isFormData && config.body) {
      headers["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    let response;
    try {
      response = await fetch(API + path, Object.assign({}, config, { headers }));
    } catch (_error) {
      throw new Error("Could not reach the HOSPEX server. Please make sure the backend is running.");
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) clearSession();
      throw new Error(result.message || "Request failed. Please try again.");
    }
    return result;
  }

  global.HospexAuth = { getToken, getUser, setSession, clearSession, isLoggedIn, isAdmin, apiFetch, API };
})(window);
