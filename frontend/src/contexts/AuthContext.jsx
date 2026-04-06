import React, { createContext, useState, useEffect } from 'react';
import api from '../api';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On initial load, check if token exists and load user profile
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Verify token isn't completely expired
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 < Date.now()) {
            logout();
          } else {
            // Fetch the full profile from backend
            const response = await api.get('/auth/me/');
            setUser(response.data);
          }
        } catch (error) {
          console.error("Auth init failed", error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (accessToken, refreshToken, userData) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
