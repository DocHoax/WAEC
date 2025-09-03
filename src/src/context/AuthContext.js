import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

// Use environment variable or fallback to Render.com URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://waec-gfv0.onrender.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshToken = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime + 300) {
        console.log('AuthContext - Refreshing token');
        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        localStorage.setItem('token', res.data.token);
        await verifyToken(res.data.token);
        return true;
      }
      return true;
    } catch (err) {
      console.error('AuthContext - Token refresh failed:', err.response?.data || err.message);
      setError('Session expired. Please log in again.');
      return false;
    }
  }, []);

  const verifyToken = useCallback(async (token) => {
    console.log('AuthContext - Verifying token:', token);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('AuthContext - User verified:', res.data);
      setUser(res.data);
      setError(null);
      return true;
    } catch (err) {
      console.error('AuthContext - Token verification failed:', err.response?.data || err.message);
      setError('Session expired. Please log in again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('AuthContext - Initializing, token:', token ? 'Present' : 'Absent');
      if (token) {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.log('AuthContext - Token expired, attempting refresh');
          const refreshed = await refreshToken();
          if (!refreshed) {
            setUser(null);
            localStorage.removeItem('token');
            setLoading(false);
            return;
          }
        }
        await verifyToken(token);
      } else {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [verifyToken, refreshToken]);

  const login = async (username, password) => {
    console.log('AuthContext - Login attempt for:', username);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { username, password });
      console.log('AuthContext - Login successful:', res.data.user);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setError(null);
      await verifyToken(res.data.token);
      return res.data;
    } catch (err) {
      console.error('AuthContext - Login failed:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('AuthContext - Logging out user:', user?.username);
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      error,
      setError,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};