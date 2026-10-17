import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, authService } from '../modules/auth/services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('ceylon_auth_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((u) => {
        if (u) {
          setUser(u);
          localStorage.setItem('ceylon_auth_user', JSON.stringify(u));
        } else if (!localStorage.getItem('ceylon_auth_token')) {
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const resp = await authService.login(email, pass);
      setUser(resp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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
