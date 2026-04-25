import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, getCurrentUser, isAuthenticated } from '../services/authService';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes from the service
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    isAuthenticated: isAuthenticated(),
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
