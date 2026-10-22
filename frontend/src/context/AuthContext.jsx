import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('railfood_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('railfood_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      const savedUser = localStorage.getItem('railfood_user');
      const savedToken = localStorage.getItem('railfood_token');
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setToken(savedToken);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      const data = response.data;
      const userData = {
        id: data.user_id,
        name: data.name,
        email: email,
        role: data.role.toLowerCase(),
      };

      localStorage.setItem('railfood_token', data.access_token);
      localStorage.setItem('railfood_user', JSON.stringify(userData));
      setToken(data.access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const msg = error.response?.data?.detail || 'Login failed. Please verify credentials.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      await authApi.register(userData);
      // Auto-login after registration
      return await login(userData.email, userData.password);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Registration failed.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('railfood_token');
    localStorage.removeItem('railfood_user');
    setToken(null);
    setUser(null);
  };

  // Demo one-click switch for fast evaluation of all 3 portals
  const switchDemoRole = async (targetRole) => {
    if (targetRole === 'admin') {
      return await login('admin@railfood.app', 'AdminPass123!');
    } else if (targetRole === 'vendor') {
      return await login('vendor@railfood.app', 'VendorPass123!');
    } else {
      return await login('amit.sharma@example.com', 'Password123!');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        role: user?.role || 'passenger',
        login,
        register,
        logout,
        switchDemoRole,
        loading,
      }}
    >
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
