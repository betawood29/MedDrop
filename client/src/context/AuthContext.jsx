// Auth context — manages user login state, token, and profile across the app
// Stores token + user in localStorage for persistence

import { createContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch { /* ignore bad data */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      updateUser(res.data.data);
    } catch {
      // Token may be invalid
    }
  }, [updateUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
