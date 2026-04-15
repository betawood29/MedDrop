// Auth context — manages user login state, token, and profile across the app
// Stores token + user in localStorage for persistence

import { createContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';

export const AuthContext = createContext(null);

// Normalize user object: old sessions stored `id` instead of `_id`
const normalizeUser = (u) => {
  if (!u) return u;
  if (u._id) return u;
  if (u.id) return { ...u, _id: u.id };
  return u;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(normalizeUser(JSON.parse(savedUser)));
      } catch { /* ignore bad data */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, userData) => {
    const u = normalizeUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    const u = normalizeUser(userData);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
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
