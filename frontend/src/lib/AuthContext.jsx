import { createContext, useContext, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  function applySession(data) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.requires2FA) return { requires2FA: true, pendingToken: data.pendingToken };
    return { requires2FA: false, user: applySession(data) };
  }

  async function verifyTwoFactor(pendingToken, code) {
    const { data } = await api.post('/auth/2fa/login', { pendingToken, code });
    return applySession(data);
  }

  function refreshUser(patch) {
    const next = { ...user, ...patch };
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  const isStaff = user && ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, login, verifyTwoFactor, refreshUser, logout, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
