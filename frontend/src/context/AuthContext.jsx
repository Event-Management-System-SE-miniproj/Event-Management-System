import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => localStorage.getItem('ems_auth_token'));
  const [loading, setLoading] = useState(true);

  // Sync profile when token exists on mount
  useEffect(() => {
    async function loadUserProfile() {
      if (authService.isAuthenticated()) {
        try {
          const res = await authService.getProfile();
          if (res && res.user) {
            setUser(res.user);
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          // Token could be expired or database reset
          if (err.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    }

    loadUserProfile();

    // Listen for global auth expiration events triggered by API interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('ems_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('ems_auth_expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const updateProfile = async (userData) => {
    const res = await authService.updateProfile(userData);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    updateProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
