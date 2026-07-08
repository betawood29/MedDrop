// Auth context — manages user login state, token, and profile across the app
// Stores token + user in localStorage for persistence

import { useState, useCallback } from 'react';
import { getMe } from '../services/authService';
import { AuthContext } from './AuthContextBase';

// Normalize user object: old sessions stored `id` instead of `_id`
const normalizeUser = (u) => {
  if (!u) return u;
  if (u._id) return u;
  if (u.id) return { ...u, _id: u.id };
  return u;
};

// Read any existing session from localStorage synchronously, as the initial state itself
// rather than in a post-mount effect — avoids an extra render pass and a one-tick flash
// of "loading" before a saved session is applied.
const readStoredUser = () => {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  if (!token || !savedUser) return null;
  try {
    return normalizeUser(JSON.parse(savedUser));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  // Session hydration is synchronous (localStorage) now, so there's no loading phase —
  // kept in the context value since consumers (e.g. ProtectedRoute) key off it.
  const loading = false;

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
