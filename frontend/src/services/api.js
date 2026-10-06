/**
 * Base API Client for Event Management System
 * Handles JWT injection, JSON body encoding, standard error extraction, and response normalization.
 */

const TOKEN_KEY = 'ems_auth_token';
const USER_KEY = 'ems_auth_user';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStorage = {
  get: () => {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  set: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  remove: () => localStorage.removeItem(USER_KEY),
};

/**
 * Custom Error class with HTTP status code and server payload
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core HTTP request handler
 */
export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, requiresAuth = false } = options;

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const token = tokenStorage.get();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  } else if (requiresAuth) {
    throw new ApiError('Authentication required. Please log in.', 401);
  }

  const config = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (networkError) {
    throw new ApiError(
      'Network error: Unable to communicate with the server. Ensure the backend is running.',
      0,
      { originalError: networkError.message }
    );
  }

  // Parse JSON response safely
  let responseData;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    // If token is invalid/expired (401 on protected route), clear credentials
    if (response.status === 401 && token) {
      tokenStorage.remove();
      userStorage.remove();
      window.dispatchEvent(new CustomEvent('ems_auth_expired'));
    }

    const errorMessage =
      (responseData && responseData.message) ||
      (typeof responseData === 'string' && responseData) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData;
}

export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE', body }),
};
